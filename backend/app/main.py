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

    return IngestResponse(
        document_id=document_id,
        document_name=document_name,
        chunks_indexed=indexed,
        embedding_model=embed_model,
    )


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
                limit=payload.top_k,
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
                    limit=payload.top_k,
                    with_payload=True,
                    with_vectors=False,
                ).points
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        context_items: list[dict[str, Any]] = []
        context_texts: list[str] = []
        
        for point in results:
            payload_data = point.payload or {}
            legacy_metadata = payload_data.get("metadata") or {}

            text = payload_data.get("text") or payload_data.get("page_content") or ""
            document_id = payload_data.get("document_id") or legacy_metadata.get("document_id")
            document_name = payload_data.get("document_name") or legacy_metadata.get("document_name")
            page = payload_data.get("page")
            if page is None:
                page = legacy_metadata.get("page")
            score = float(point.score or 0)

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
        prompt_text = prompt_store.build_rag_prompt(
            context=context_block,
            question=payload.query,
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

    return QueryResponse(
        answer=generation_output or "",
        context=context_items,
        compliance_blocked=False,
        compliance_info=ComplianceInfo(**compliance_result),
    )
