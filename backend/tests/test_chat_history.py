from app.core.config import get_settings
from app.db import connect, initialize_database
from app.main import _conversation_history, _create_conversation, _save_turn


def test_conversation_history_persists_across_requests(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "chat.sqlite3"))
    get_settings.cache_clear()
    initialize_database()

    conversation_id = _create_conversation("tenant-a")
    _save_turn(conversation_id, "What is BGE-M3?", "It is a multilingual embedding model.")
    _save_turn(conversation_id, "Does it support French?", "Yes, it supports French.")

    history = _conversation_history(conversation_id, "tenant-a")
    assert len(history) == 4
    assert history[0] == {"role": "user", "content": "What is BGE-M3?"}
    assert history[-1] == {"role": "assistant", "content": "Yes, it supports French."}

    with connect() as conn:
        assert conn.execute(
            "SELECT COUNT(*) FROM conversations WHERE conversation_id = ?",
            (conversation_id,),
        ).fetchone()[0] == 1
    get_settings.cache_clear()
