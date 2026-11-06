from fastapi.testclient import TestClient

from app.core.config import get_settings
import app.main as main


def test_greetings_and_followups_use_persistent_conversation(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "endpoint.sqlite3"))
    get_settings.cache_clear()

    retrieval_queries = []
    rewrite_calls = []

    def fake_retrieve(question, top_k, tenant_id):
        retrieval_queries.append(question)
        return [{
            "document_id": "doc-1",
            "filename": "guide.md",
            "chunk_index": 0,
            "heading": "BGE-M3",
            "content": "BGE-M3 is a multilingual embedding model that supports French.",
            "similarity": 0.91,
        }]

    async def fake_generate(question, sources, history):
        return ("BGE-M3 supports French.", "groq")

    async def fake_rewrite(question, history):
        rewrite_calls.append((question, history))
        return "BGE-M3 French language support"

    monkeypatch.setattr(main, "retrieve", fake_retrieve)
    monkeypatch.setattr(main, "generate_answer", fake_generate)
    monkeypatch.setattr(main, "rewrite_retrieval_query", fake_rewrite)

    with TestClient(main.app) as client:
        from app.auth import hash_api_key
        from app.db import connect
        with connect() as conn:
            conn.execute("INSERT INTO clients (tenant_id, name, api_key_hash) VALUES (?, ?, ?)",
                         ("tenant-a", "Client A", hash_api_key("test-key-a")))
        headers = {"Authorization": "Bearer test-key-a"}
        greeting = client.post("/chat", json={"question": "Hi!"}, headers=headers)
        assert greeting.status_code == 200
        greeting_data = greeting.json()
        assert greeting_data["model_provider"] == "local"
        assert greeting_data["sources"] == []
        assert greeting_data["conversation_id"]
        assert retrieval_queries == []

        first = client.post("/chat", json={
            "conversation_id": greeting_data["conversation_id"],
            "question": "What is BGE-M3?"
        }, headers=headers)
        assert first.status_code == 200
        assert len(retrieval_queries) == 1
        assert first.json()["answer"] == "BGE-M3 supports French."

        followup = client.post("/chat", json={
            "conversation_id": greeting_data["conversation_id"],
            "question": "Does it support French?"
        }, headers=headers)
        assert followup.status_code == 200
        assert retrieval_queries[-1] == "BGE-M3 French language support"
        assert rewrite_calls
        assert len(rewrite_calls[0][1]) >= 2

    get_settings.cache_clear()
