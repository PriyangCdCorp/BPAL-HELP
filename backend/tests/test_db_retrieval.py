import numpy as np

from app.core.config import get_settings
from app.db import connect, initialize_database
import app.retrieval as retrieval


def test_sqlite_schema_and_cascade(tmp_path, monkeypatch):
    db_path = tmp_path / "test.sqlite3"
    monkeypatch.setenv("DATABASE_PATH", str(db_path))
    get_settings.cache_clear()
    initialize_database()

    with connect() as conn:
        conn.execute(
            "INSERT INTO documents (document_id, filename, file_type, content_hash, chunk_count) VALUES (?, ?, ?, ?, ?)",
            ("doc-1", "guide.md", "md", "hash-1", 1),
        )
        conn.execute(
            "INSERT INTO document_chunks (chunk_id, document_id, chunk_index, content, metadata, embedding, embedding_dim) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("chunk-1", "doc-1", 0, "SQLite stores local data.", "{}", np.array([1, 0, 0], dtype=np.float32).tobytes(), 3),
        )
        conn.execute("DELETE FROM documents WHERE document_id = ?", ("doc-1",))
        count = conn.execute("SELECT COUNT(*) FROM document_chunks").fetchone()[0]
    assert count == 0
    get_settings.cache_clear()


def test_vector_retrieval_orders_by_cosine_similarity(tmp_path, monkeypatch):
    db_path = tmp_path / "vectors.sqlite3"
    monkeypatch.setenv("DATABASE_PATH", str(db_path))
    monkeypatch.setenv("MIN_SIMILARITY", "0.0")
    get_settings.cache_clear()
    initialize_database()

    with connect() as conn:
        conn.execute(
            "INSERT INTO documents (document_id, filename, file_type, content_hash, chunk_count) VALUES (?, ?, ?, ?, ?)",
            ("doc-1", "manual.txt", "txt", "hash-1", 2),
        )
        for index, (content, vector) in enumerate([
            ("Most relevant passage", [1.0, 0.0, 0.0]),
            ("Less relevant passage", [0.0, 1.0, 0.0]),
        ]):
            conn.execute(
                """INSERT INTO document_chunks
                   (chunk_id, document_id, chunk_index, content, metadata, embedding, embedding_dim)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (f"chunk-{index}", "doc-1", index, content, "{}",
                 np.asarray(vector, dtype=np.float32).tobytes(), 3),
            )

    monkeypatch.setattr(retrieval, "embed_query", lambda _question: [1.0, 0.0, 0.0])
    results = retrieval.retrieve("test query", 2, "__unassigned__")
    assert results[0]["content"] == "Most relevant passage"
    assert results[0]["similarity"] > results[1]["similarity"]
    get_settings.cache_clear()
