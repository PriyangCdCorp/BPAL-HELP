from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "production-rag"
    app_env: str = "development"
    log_level: str = "INFO"
    database_path: str = "storage/rag.sqlite3"
    document_upload_dir: str = "storage/uploads"
    cms_media_dir: str = "storage/cms_media"
    cms_allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    embedding_concurrency: int = 1
    chat_requests_per_minute: int = 60
    embedding_model: str = "BAAI/bge-m3"
    embedding_batch_size: int = 4
    embedding_max_length: int = 1024
    chunk_max_chars: int = 2400
    chunk_overlap_chars: int = 300
    default_top_k: int = 5
    max_top_k: int = 10
    min_similarity: float = 0.30
    max_upload_mb: int = 25
    admin_api_key: str = ""
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    llm_timeout_seconds: int = 90
    max_context_chars: int = 18000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
