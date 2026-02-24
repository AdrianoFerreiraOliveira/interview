from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ollama_base_url: str = "http://ollama:11434"
    qdrant_url: str = "http://qdrant:6333"
    qdrant_collection: str = "rag_documents"
    embedding_model: str = "nomic-embed-text"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    embed_batch_size: int = 32

    redis_url: str = "redis://localhost:6379/0"
    cache_ttl: int = 3600
    rerank_top_n: int = 15

    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_base_url: str | None = None
    langfuse_tracing_enabled: bool = True

    openai_api_key: str | None = None

    supabase_url: str | None = None
    supabase_key: str | None = None
    
    minio_url: str = "http://minio:9000"
    minio_access_key: str = "minio"
    minio_secret_key: str = "miniosecret"
    minio_bucket: str = "documents"

    cors_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
