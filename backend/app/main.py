from __future__ import annotations

import os
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from qdrant_client import QdrantClient

from .compliance_store import ComplianceStore, GuardrailConfig
from .config import get_settings
from .guardrails import check_compliance
from .langfuse_client import LangfuseHelper
from .ollama_client import OllamaClient
from .prompt_store import PromptConfig, PromptStore
from .rag import split_documents, load_document, ingest_documents
from .minio_client import MinioHelper
from .supabase_client import SupabaseHelper
from .redis_helpers import RedisHelpers

_ranker = None
def get_ranker():
    global _ranker
    if _ranker is None:
        try:
            from flashrank import Ranker
            import logging
            logging.info("Initializing Flashrank Ranker...")
            _ranker = Ranker()
        except ImportError:
            import logging
            logging.warning("Flashrank not installed, reranking disabled.")
            _ranker = False
    return _ranker if _ranker is not False else None


settings = get_settings()

# Propagate OPENAI_API_KEY from settings into env so the agents SDK picks it up
if settings.openai_api_key:
    os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)

app = FastAPI(title="RAG Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.cors_origins.split(",")
        if origin.strip()
    ] if settings.cors_origins != "*" else ["*"],
    allow_credentials=True if settings.cors_origins != "*" else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

qdrant = QdrantClient(url=settings.qdrant_url)
ollama = OllamaClient(settings.ollama_base_url)
langfuse = LangfuseHelper(settings)


# ---------------------------------------------------------------------------
#  Request / Response models
# ---------------------------------------------------------------------------

from pydantic import BaseModel, Field, ConfigDict

class QueryRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    query: str = Field(..., min_length=1)
    model: str = Field(..., description="Ollama model for generation")
    top_k: int = Field(4, ge=1, le=20)
    embedding_model: str | None = Field(None, description="Ollama model for embeddings")
    temperature: float = Field(0.2, ge=0, le=2)
    session_id: str | None = Field(None, description="Optional Session ID for chat memory")

class ComplianceInfo(BaseModel):
    is_blocked: bool = False
    detected_topic: str = ""
    reasoning: str = ""


class QueryResponse(BaseModel):
    answer: str
    context: list[dict[str, Any]]
    compliance_blocked: bool = False
    compliance_info: ComplianceInfo | None = None


class IngestResponse(BaseModel):
    document_id: str
    document_name: str
    chunks_indexed: int
    embedding_model: str


class DocumentResponse(BaseModel):
    id: str
    name: str
    created_at: str | None = None
    url: str | None = None


class ComplianceCheckRequest(BaseModel):
    query: str = Field(..., min_length=1)


class ComplianceCheckResponse(BaseModel):
    is_blocked: bool
    detected_topic: str = ""
    reasoning: str = ""


from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    import logging
    logging.error(f"Unhandled Exception: {exc}")
    logging.error(traceback.format_exc())
    
    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers=headers
    )

# ---------------------------------------------------------------------------
#  Health & Models
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/models")
def list_models() -> list[dict[str, Any]]:
    try:
        return ollama.list_models()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
#  Guardrails Config endpoints
# ---------------------------------------------------------------------------

@app.get("/guardrails/config", response_model=GuardrailConfig)
def get_guardrails_config() -> GuardrailConfig:
    return ComplianceStore.get().config


@app.put("/guardrails/config", response_model=GuardrailConfig)
def update_guardrails_config(payload: dict[str, Any]) -> GuardrailConfig:
    return ComplianceStore.get().update(payload)


@app.post("/guardrails/check", response_model=ComplianceCheckResponse)
async def guardrails_check(payload: ComplianceCheckRequest) -> ComplianceCheckResponse:
    result = await check_compliance(payload.query)
    return ComplianceCheckResponse(**result)


# ---------------------------------------------------------------------------
#  Prompt Config endpoints
# ---------------------------------------------------------------------------

@app.get("/prompts/config", response_model=PromptConfig)
def get_prompts_config() -> PromptConfig:
    return PromptStore.get().config


@app.put("/prompts/config", response_model=PromptConfig)
def update_prompts_config(payload: dict[str, Any]) -> PromptConfig:
    return PromptStore.get().update(payload)


@app.post("/prompts/config/reset", response_model=PromptConfig)
def reset_prompts_config() -> PromptConfig:
    return PromptStore.get().reset()


# ---------------------------------------------------------------------------
#  Document Ingest (TXT, MD, PDF)
# ---------------------------------------------------------------------------

@app.post("/ingest/document", response_model=IngestResponse)
async def ingest_document(
    file: UploadFile = File(...),
    embedding_model: str | None = Form(None),
) -> IngestResponse:
    if not file.filename.lower().endswith((".pdf", ".txt", ".md")):
        raise HTTPException(status_code=400, detail="Only PDF, TXT and MD files are supported.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file.")

    embed_model = embedding_model or settings.embedding_model
    document_id = str(uuid4())
    document_name = file.filename

    with langfuse.trace(
        "ingest_document",
        metadata={"document_name": document_name, "embedding_model": embed_model},
    ) as span:
        try:
            from .rag import load_document, split_documents, ingest_documents
            docs = load_document(file_bytes, document_name)
            
            print(f"DEBUG: Loaded {len(docs)} document logic pages/elements from {document_name}")
            if docs:
                print(f"DEBUG: First doc start: {docs[0].page_content[:100]}")
                
        except Exception as exc:
            import logging
            logging.error(f"Document parsing failed: {exc}")
            raise HTTPException(status_code=400, detail=f"Failed to parse document. Error: {exc}")
        
        chunks = split_documents(docs, settings)
        if not chunks:
            raise HTTPException(status_code=400, detail="No text extracted from document.")
        if span:
            span.update(metadata={"chunks": len(chunks)})

        try:
            indexed = ingest_documents(
                client=qdrant,
                settings=settings,
                docs=chunks,
                document_id=document_id,
                document_name=document_name,
                embedding_model=embed_model,
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
            
    # 1. Upload to MinIO
    minio = MinioHelper.get()
    object_key = f"{document_id}_{document_name}"
    minio.upload_file(file_bytes, object_key, file.content_type or "application/pdf")
    
    # 2. Register in Supabase
    supabase = SupabaseHelper.get()
    if supabase.client:
        try:
            supabase.client.table("documents").insert({
                "id": document_id,
                "name": document_name,
                "object_key": object_key
            }).execute()
        except Exception as e:
            import logging
            logging.error(f"Failed to register document in Supabase: {e}")

    return IngestResponse(
        document_id=document_id,
        document_name=document_name,
        chunks_indexed=indexed,
        embedding_model=embed_model,
    )

@app.get("/documents", response_model=list[DocumentResponse])
def get_documents() -> list[DocumentResponse]:
    supabase = SupabaseHelper.get()
    minio = MinioHelper.get()
    docs = []
    
    if supabase.client:
        try:
            response = supabase.client.table("documents").select("*").execute()
            for row in response.data:
                doc_url = None
                if row.get("object_key"):
                    doc_url = minio.get_presigned_url(row["object_key"])
                
                docs.append(DocumentResponse(
                    id=row["id"],
                    name=row["name"],
                    created_at=row.get("created_at"),
                    url=doc_url
                ))
        except Exception as e:
            import logging
            logging.error(f"Failed to fetch documents from Supabase: {e}")
            raise HTTPException(status_code=500, detail="Database fetch error")
            
    return docs

@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    supabase = SupabaseHelper.get()
    minio = MinioHelper.get()
    
    # 1. Delete from Supabase and MinIO
    if supabase.client:
        try:
            # Get object details to delete in MinIO
            response = supabase.client.table("documents").select("object_key").eq("id", document_id).execute()
            if response.data and len(response.data) > 0:
                object_key = response.data[0].get("object_key")
                if object_key:
                    minio.delete_file(object_key)
            
            # Delete from DB
            supabase.client.table("documents").delete().eq("id", document_id).execute()
        except Exception as e:
            import logging
            logging.error(f"Failed to delete document from Supabase/MinIO: {e}")
            
    # 2. Delete from Qdrant
    try:
        from qdrant_client.http import models as qdrant_models
        # We delete by document_id in payload
        qdrant.delete(
            collection_name=settings.qdrant_collection,
            points_selector=qdrant_models.FilterSelector(
                filter=qdrant_models.Filter(
                    must=[
                        qdrant_models.FieldCondition(
                            key="document_id",
                            match=qdrant_models.MatchValue(value=document_id),
                        )
                    ]
                )
            )
        )
    except Exception as e:
         import logging
         logging.error(f"Failed to delete document vectors from Qdrant: {e}")

    return {"status": "success", "document_id": document_id}


# ---------------------------------------------------------------------------
#  RAG Query  (with compliance pre-check)
# ---------------------------------------------------------------------------

@app.post("/query", response_model=QueryResponse)
async def query_rag(payload: QueryRequest) -> QueryResponse:
    embed_model = payload.embedding_model or settings.embedding_model

    # ---- Step 1: Compliance check ----
    compliance_result = await check_compliance(payload.query)
    if compliance_result.get("is_blocked"):
        store = ComplianceStore.get()
        return QueryResponse(
            answer=store.config.compliance_message,
            context=[],
            compliance_blocked=True,
            compliance_info=ComplianceInfo(**compliance_result),
        )

    # ---- Step 1.5: Cache Check ----
    cached_response = RedisHelpers.check_cache(payload.query, payload.model)
    if cached_response and not payload.session_id: # Only use Exact Match Cache if no history involved, or consider session + query
        return QueryResponse(**cached_response)

    # ---- Step 2: RAG pipeline ----
    with langfuse.trace(
        "rag_query",
        metadata={"model": payload.model, "embedding_model": embed_model},
    ) as span:
        try:
            from qdrant_client.http import models as qdrant_models
            from langchain_ollama import OllamaEmbeddings
            
            # Prefer the current payload layout used in Qdrant:
            # embedding_model (top-level payload field).
            qdrant_filter = qdrant_models.Filter(
                must=[
                    qdrant_models.FieldCondition(
                        key="embedding_model",
                        match=qdrant_models.MatchValue(value=embed_model),
                    )
                ]
            )

            embeddings = OllamaEmbeddings(
                model=embed_model,
                base_url=settings.ollama_base_url,
            )
            query_vector = embeddings.embed_query(payload.query)

            results = qdrant.query_points(
                collection_name=settings.qdrant_collection,
                query=query_vector,
                query_filter=qdrant_filter,
                limit=settings.rerank_top_n, # Retrieve more docs for reranking
                with_payload=True,
                with_vectors=False,
            ).points

            # Backward-compatibility fallback for older payload layout.
            if not results:
                legacy_filter = qdrant_models.Filter(
                    must=[
                        qdrant_models.FieldCondition(
                            key="metadata.embedding_model",
                            match=qdrant_models.MatchValue(value=embed_model),
                        )
                    ]
                )
                results = qdrant.query_points(
                    collection_name=settings.qdrant_collection,
                    query=query_vector,
                    query_filter=legacy_filter,
                    limit=settings.rerank_top_n, # Retrieve more docs for reranking
                    with_payload=True,
                    with_vectors=False,
                ).points
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        # ---- Reranking Step ----
        rerank_docs = []
        for point in results:
            payload_data = point.payload or {}
            text = payload_data.get("text") or payload_data.get("page_content") or ""
            rerank_docs.append({
                "id": str(point.id),
                "text": text,
                "meta": payload_data,
                "original_score": float(point.score or 0)
            })

        ranker = get_ranker()
        if ranker and rerank_docs:
            from flashrank import RerankRequest
            rerankrequest = RerankRequest(query=payload.query, passages=rerank_docs)
            rerank_results = ranker.rerank(rerankrequest)
            top_results = rerank_results[:payload.top_k]
        else:
            top_results = rerank_docs[:payload.top_k]

        context_items: list[dict[str, Any]] = []
        context_texts: list[str] = []
        
        for item in top_results:
            payload_data = item.get("meta", {})
            legacy_metadata = payload_data.get("metadata") or {}

            text = item.get("text") or payload_data.get("page_content") or ""
            document_id = payload_data.get("document_id") or legacy_metadata.get("document_id")
            document_name = payload_data.get("document_name") or legacy_metadata.get("document_name")
            page = payload_data.get("page")
            if page is None:
                page = legacy_metadata.get("page")
            # flashrank returns new score in 'score', fallback to original
            score = float(item.get("score", item.get("original_score", 0)))

            context_items.append(
                {
                    "text": text,
                    "document_id": document_id,
                    "document_name": document_name,
                    "page": page,
                    "score": score,
                }
            )
            context_texts.append(text)

        prompt_store = PromptStore.get()
        context_block = chr(10).join(context_texts)
        
        # Load Chat History
        chat_history = ""
        if payload.session_id:
            chat_history = RedisHelpers.get_chat_history(payload.session_id)
            
        prompt_text = prompt_store.build_rag_prompt(
            context=context_block,
            question=payload.query,
            chat_history=chat_history
        )

        generation_output = None
        with langfuse.generation(
            name="ollama_generate",
            model=payload.model,
            input={"prompt": prompt_text},
            model_parameters={"temperature": payload.temperature},
        ) as generation:
            
            from langchain_ollama import OllamaLLM
            llm = OllamaLLM(
                base_url=settings.ollama_base_url,
                model=payload.model,
                temperature=payload.temperature
            )
            
            generation_output = llm.invoke(prompt_text)
            
            if generation:
                generation.update(output=generation_output)

        # Save to Chat History
        if payload.session_id and generation_output:
            RedisHelpers.add_chat_history(payload.session_id, payload.query, generation_output)

    final_response = QueryResponse(
        answer=generation_output or "",
        context=context_items,
        compliance_blocked=False,
        compliance_info=ComplianceInfo(**compliance_result),
    )
    
    # Save to Cache (only if no session history involved, to keep caching pure)
    if not payload.session_id:
        RedisHelpers.set_cache(payload.query, payload.model, final_response.model_dump(), ttl=settings.cache_ttl)

    return final_response
