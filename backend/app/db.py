import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.core.config import get_settings


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    settings = get_settings()
    db_path = Path(settings.database_path)
    if str(db_path) != ":memory:":
        db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 30000")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def initialize_database() -> None:
    with connect() as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                tenant_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                api_key_hash TEXT NOT NULL UNIQUE,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                document_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL CHECK (file_type IN ('txt', 'docx', 'md')),
                content_hash TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'indexed',
                chunk_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            )
        """)
        _ensure_column(conn, "documents", "tenant_id", "TEXT NOT NULL DEFAULT '__unassigned__'")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                chunk_id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                heading TEXT,
                metadata TEXT NOT NULL DEFAULT '{}',
                embedding BLOB NOT NULL,
                embedding_dim INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                UNIQUE(document_id, chunk_index)
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_embedding_dim ON document_chunks(embedding_dim)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                conversation_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            )
        """)
        _ensure_column(conn, "conversations", "tenant_id", "TEXT NOT NULL DEFAULT '__unassigned__'")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                message_id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at)")
        conn.execute("""CREATE TABLE IF NOT EXISTS chat_rate_limits(
            tenant_id TEXT PRIMARY KEY, window_start TEXT NOT NULL,
            requests INTEGER NOT NULL
        )""")
