from __future__ import annotations

import tempfile
import os
from typing import List
from uuid import uuid4

from langchain_community.document_loaders import PyPDFLoader, TextLoader, UnstructuredMarkdownLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from qdrant_client import QdrantClient
from langchain_qdrant import QdrantVectorStore
from langchain_ollama import OllamaEmbeddings

from .config import Settings


def load_document(file_bytes: bytes, filename: str) -> List[Document]:
    ext = os.path.splitext(filename)[1].lower()
    
    # Write to a temp file because LangChain Loaders typically require file paths
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
        temp_file.write(file_bytes)
        temp_file_path = temp_file.name

    try:
        if ext == ".pdf":
            loader = PyPDFLoader(temp_file_path)
        elif ext == ".md":
            loader = UnstructuredMarkdownLoader(temp_file_path)
        elif ext == ".txt":
            loader = TextLoader(temp_file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")
            
        docs = loader.load()
    finally:
        os.remove(temp_file_path)
        
    return docs


def split_documents(docs: List[Document], settings: Settings) -> List[Document]:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )
    return text_splitter.split_documents(docs)


def get_vector_store(client: QdrantClient, settings: Settings, embedding_model: str) -> QdrantVectorStore:
    embeddings = OllamaEmbeddings(
        model=embedding_model,
        base_url=settings.ollama_base_url
    )
    
    return QdrantVectorStore(
        client=client,
        collection_name=settings.qdrant_collection,
        embedding=embeddings,
    )


def ingest_documents(
    client: QdrantClient,
    settings: Settings,
    docs: List[Document],
    document_id: str,
    document_name: str,
    embedding_model: str,
) -> int:
    if not docs:
        return 0

    # Inject metadata
    for i, doc in enumerate(docs):
        # Extract page if PyPDFLoader added it, or default to 1
        page_num = doc.metadata.get("page", 0)
        
        # Clean up existing metadata to prevent Qdrant conflicts
        doc.metadata.clear()
        
        doc.metadata.update({
            "document_id": document_id,
            "document_name": document_name,
            "embedding_model": embedding_model,
            "chunk_index": i,
            "page": page_num
        })

    vector_store = get_vector_store(client, settings, embedding_model)
    
    # LangChain's add_documents automatically handles batching and embeddings
    vector_store.add_documents(docs)
    
    return len(docs)
