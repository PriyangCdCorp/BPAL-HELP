import hashlib
import json
import logging
import sqlite3
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime, timedelta, timezone
from starlette.concurrency import run_in_threadpool
from pathlib import Path
from uuid import uuid4

import numpy as np
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db import initialize_database, connect
from app.ingestion import SUPPORTED_EXTENSIONS, parse_document, split_text, new_document_id
from app.embeddings import embed_documents
from app.retrieval import retrieve
from app.generation import generate_answer, rewrite_retrieval_query
from app.conversation import greeting_response
from app.schemas import ChatRequest, ChatResponse, SourceItem
from app.auth import Client, require_client, require_admin, hash_api_key, create_api_key
from app.cms import admin_router as cms_admin_router, public_router as cms_public_router, initialize_cms_database
from app.admin_auth import router as admin_auth_router, initialize_admin_auth_database, require_cms_admin, AdminUser

logger = logging.getLogger(__name__)
settings = get_settings()
GLOBAL_TENANT_ID = "__GLOBAL__"  # Reserved system-wide knowledge scope, not a customer.
STORAGE_DIR = Path(settings.document_upload_dir)
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Limit concurrent CPU-heavy BGE-M3 operations per API process.
_embedding_limit = asyncio.Semaphore(max(1, settings.embedding_concurrency))


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    if settings.app_env.lower() == "production":
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY must be configured before running production chat.")
        if not Path(settings.database_path).is_absolute():
            raise RuntimeError("DATABASE_PATH must be absolute in production.")
        if not Path(settings.cms_media_dir).is_absolute() or not Path(settings.document_upload_dir).is_absolute():
            raise RuntimeError("Production upload and media paths must be absolute.")
        if settings.admin_api_key and len(settings.admin_api_key) < 32:
            raise RuntimeError("ADMIN_API_KEY must be at least 32 characters if enabled in production.")
    initialize_database()
    initialize_cms_database()
    initialize_admin_auth_database()
    logger.info("Application startup complete; SQLite database: %s", settings.database_path)
    yield


app = FastAPI(
    title=settings.app_name,
    version="3.0.0",
    lifespan=lifespan,
    description="Private RAG API",
    docs_url=None if settings.app_env.lower() == "production" else "/docs",
    redoc_url=None if settings.app_env.lower() == "production" else "/redoc",
    openapi_url=None if settings.app_env.lower() == "production" else "/openapi.json"
)


# Preserve configured CORS origins and explicitly allow the local production CMS UI.
_cms_origins = {origin.strip() for origin in settings.cms_allowed_origins.split(",") if origin.strip()}
_cms_origins.update({"http://127.0.0.1:8081", "http://localhost:8081"})
app.add_middleware(CORSMiddleware, allow_origins=sorted(_cms_origins), allow_credentials=False, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])

@app.middleware("http")
async def private_response_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith(("/admin", "/content/", "/chat")):
        response.headers["Cache-Control"] = "no-store"
    return response


app.include_router(admin_auth_router)
app.include_router(cms_admin_router)
app.include_router(cms_public_router)


@app.get("/")
def root():
    return {"application": settings.app_name, "client_endpoint": "POST /chat"}


@app.get("/health")
def health():
    try:
        with connect() as conn:
            conn.execute("SELECT 1").fetchone()
        return {"status": "ok", "database": "sqlite"}
    except Exception as exc:
        logger.exception("Health check failed")
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@app.post("/admin/clients", dependencies=[Depends(require_admin)])
def create_client(name: str = Form(...)):
    name = name.strip()
    if not name or len(name) > 160:
        raise HTTPException(status_code=400, detail="Client name must be 1-160 characters.")
    tenant_id = str(uuid4())
    api_key = create_api_key()
    with connect() as conn:
        conn.execute(
            "INSERT INTO clients (tenant_id, name, api_key_hash) VALUES (?, ?, ?)",
            (tenant_id, name, hash_api_key(api_key)),
        )
    # The raw key is shown only once. Only its hash is stored.
    return {"tenant_id": tenant_id, "name": name, "api_key": api_key,
            "message": "Save this API key securely; it cannot be retrieved later."}


@app.post("/admin/clients/{tenant_id}/rotate-key", dependencies=[Depends(require_admin)])
def rotate_client_key(tenant_id: str):
    """Issue a replacement client key; the plaintext key is returned only once."""
    new_key = create_api_key()
    with connect() as conn:
        cur = conn.execute(
            "UPDATE clients SET api_key_hash = ? WHERE tenant_id = ? AND is_active = 1",
            (hash_api_key(new_key), tenant_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Active client not found.")
    return {"tenant_id": tenant_id, "api_key": new_key,
            "message": "Save this replacement key securely; the previous key is now invalid."}


@app.patch("/admin/clients/{tenant_id}/deactivate", dependencies=[Depends(require_admin)])
def deactivate_client(tenant_id: str):
    with connect() as conn:
        cur = conn.execute("UPDATE clients SET is_active = 0 WHERE tenant_id = ?", (tenant_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Client not found.")
    return {"status": "deactivated", "tenant_id": tenant_id}


@app.get("/admin/clients", dependencies=[Depends(require_admin)])
def list_clients():
    with connect() as conn:
        rows = conn.execute(
            "SELECT tenant_id, name, is_active, created_at FROM clients ORDER BY created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


# CMS session-authenticated client management. Legacy X-Admin-Key routes remain unchanged.
from pydantic import BaseModel, Field

class CMSClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)

class CMSClientRename(BaseModel):
    name: str = Field(min_length=1, max_length=160)

def _require_client_manager(admin: AdminUser = Depends(require_cms_admin)) -> AdminUser:
    if admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only ADMIN users can manage clients.")
    return admin

@app.get("/admin/cms/clients")
def cms_clients_list(admin: AdminUser = Depends(_require_client_manager)):
    with connect() as conn:
        return [dict(r) for r in conn.execute(
            "SELECT tenant_id, name, is_active, created_at FROM clients ORDER BY created_at DESC, tenant_id DESC"
        ).fetchall()]

@app.post("/admin/cms/clients", status_code=201)
def cms_clients_create(payload: CMSClientCreate, admin: AdminUser = Depends(_require_client_manager)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Client name is required.")
    tenant_id, api_key = str(uuid4()), create_api_key()
    with connect() as conn:
        conn.execute("INSERT INTO clients (tenant_id,name,api_key_hash) VALUES (?,?,?)",
                     (tenant_id,name,hash_api_key(api_key)))
    return {"tenant_id":tenant_id,"name":name,"api_key":api_key,
            "message":"Save the key now; it will not be shown again."}

@app.patch("/admin/cms/clients/{tenant_id}")
def cms_clients_rename(tenant_id: str, payload: CMSClientRename,
                       admin: AdminUser = Depends(_require_client_manager)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Client name is required.")
    with connect() as conn:
        result = conn.execute("UPDATE clients SET name=? WHERE tenant_id=?", (name,tenant_id))
        if not result.rowcount:
            raise HTTPException(status_code=404, detail="Client not found.")
    return {"tenant_id":tenant_id,"name":name}

@app.patch("/admin/cms/clients/{tenant_id}/status")
def cms_clients_status(tenant_id: str, enabled: bool,
                       admin: AdminUser = Depends(_require_client_manager)):
    with connect() as conn:
        result = conn.execute("UPDATE clients SET is_active=? WHERE tenant_id=?", (int(enabled),tenant_id))
        if not result.rowcount:
            raise HTTPException(status_code=404, detail="Client not found.")
    return {"tenant_id":tenant_id,"is_active":int(enabled)}

@app.post("/admin/cms/clients/{tenant_id}/rotate-key")
def cms_clients_rotate(tenant_id: str, admin: AdminUser = Depends(_require_client_manager)):
    key = create_api_key()
    with connect() as conn:
        result = conn.execute("UPDATE clients SET api_key_hash=? WHERE tenant_id=? AND is_active=1",
                              (hash_api_key(key),tenant_id))
        if not result.rowcount:
            raise HTTPException(status_code=404, detail="Active client not found.")
    return {"tenant_id":tenant_id,"api_key":key,
            "message":"Previous key has been invalidated. Save this key now."}


@app.post("/admin/documents/upload", dependencies=[Depends(require_admin)])
async def upload_document(tenant_id: str = Form(...), file: UploadFile = File(...)):
    # Global knowledge documents are indexed once for all authenticated customers.
    if tenant_id != GLOBAL_TENANT_ID:
        with connect() as conn:
            client_row = conn.execute(
                "SELECT tenant_id FROM clients WHERE tenant_id = ? AND is_active = 1", (tenant_id,)
            ).fetchone()
        if not client_row:
            raise HTTPException(status_code=404, detail="Active client not found.")
    filename = Path(file.filename or "").name
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only .txt, .md and .docx are supported.")
    content_bytes = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if len(content_bytes) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds upload size limit.")
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    digest = hashlib.sha256(tenant_id.encode() + b":" + content_bytes).hexdigest()
    with connect() as conn:
        existing = conn.execute(
            "SELECT document_id, filename FROM documents WHERE tenant_id = ? AND content_hash = ?",
            (tenant_id, digest),
        ).fetchone()
    if existing:
        return {"status": "duplicate", "document_id": existing[0], "filename": existing[1]}
    temp_path = STORAGE_DIR / f"{uuid4()}{suffix}"
    try:
        temp_path.write_bytes(content_bytes)
        text = parse_document(temp_path)
        chunks = split_text(text)
        async with _embedding_limit:
            vectors = await run_in_threadpool(embed_documents, [chunk["content"] for chunk in chunks])
        if not chunks or len(vectors) != len(chunks):
            raise RuntimeError("Document chunking or embedding failed.")
        arrays = [np.asarray(v, dtype=np.float32) for v in vectors]
        dims = {v.size for v in arrays}
        if len(dims) != 1 or not dims or any(not np.all(np.isfinite(v)) for v in arrays):
            raise RuntimeError("Embedding vectors have invalid dimensions or values.")
        document_id = new_document_id()
        with connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                """INSERT INTO documents
                   (document_id, tenant_id, filename, file_type, content_hash, status, chunk_count)
                   VALUES (?, ?, ?, ?, ?, 'indexed', ?)""",
                (document_id, tenant_id, filename, suffix[1:], digest, len(chunks)),
            )
            for chunk, vector in zip(chunks, arrays):
                normalized = vector / max(float(np.linalg.norm(vector)), 1e-12)
                conn.execute(
                    """INSERT INTO document_chunks
                       (chunk_id, document_id, chunk_index, content, heading, metadata, embedding, embedding_dim)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (str(uuid4()), document_id, chunk["chunk_index"], chunk["content"],
                     chunk["heading"], json.dumps({"original_filename": filename}),
                     sqlite3.Binary(normalized.astype(np.float32, copy=False).tobytes()),
                     int(normalized.size)),
                )
        return {"status": "indexed", "document_id": document_id, "tenant_id": tenant_id,
                "filename": filename, "chunk_count": len(chunks)}
    except Exception as exc:
        logger.exception("Document ingestion failed")
        raise HTTPException(status_code=500, detail="Document ingestion failed.") from exc
    finally:
        temp_path.unlink(missing_ok=True)


# CMS portal document routes: individual administrator bearer sessions.
# Reuse the existing ingestion functions so chat indexing behavior is unchanged.
from app.admin_auth import require_cms_admin, AdminUser

@app.post("/admin/cms/documents/upload", tags=["CMS document management"])
async def cms_upload_document(
    tenant_id: str = Form(...), file: UploadFile = File(...),
    admin: AdminUser = Depends(require_cms_admin),
):
    if admin.role == "VIEWER":
        raise HTTPException(status_code=403, detail="VIEWER cannot upload documents.")
    if tenant_id == GLOBAL_TENANT_ID and admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only ADMIN can upload global documents.")
    return await upload_document(tenant_id=tenant_id, file=file)

@app.get("/admin/cms/documents", tags=["CMS document management"])
def cms_list_documents(tenant_id: str, admin: AdminUser = Depends(require_cms_admin)):
    return list_documents(tenant_id=tenant_id)

@app.delete("/admin/cms/documents/{document_id}", tags=["CMS document management"])
def cms_delete_document(document_id: str, tenant_id: str, admin: AdminUser = Depends(require_cms_admin)):
    if admin.role == "VIEWER":
        raise HTTPException(status_code=403, detail="VIEWER cannot delete documents.")
    if tenant_id == GLOBAL_TENANT_ID and admin.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only ADMIN can delete global documents.")
    # Require the selected scope to match the document being deleted.
    with connect() as conn:
        row = conn.execute("SELECT tenant_id FROM documents WHERE document_id = ?", (document_id,)).fetchone()
    if not row or row["tenant_id"] != tenant_id:
        raise HTTPException(status_code=404, detail="Document not found for selected customer.")
    return delete_document(document_id=document_id)


@app.get("/admin/documents", dependencies=[Depends(require_admin)])
def list_documents(tenant_id: str):
    with connect() as conn:
        rows = conn.execute(
            """SELECT document_id, tenant_id, filename, file_type, chunk_count, created_at
               FROM documents WHERE tenant_id = ? ORDER BY created_at DESC""", (tenant_id,)
        ).fetchall()
    return [dict(row) for row in rows]


@app.delete("/admin/documents/{document_id}", dependencies=[Depends(require_admin)])
def delete_document(document_id: str):
    with connect() as conn:
        row = conn.execute("SELECT document_id FROM documents WHERE document_id = ?", (document_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found.")
        conn.execute("DELETE FROM documents WHERE document_id = ?", (document_id,))
    return {"status": "deleted", "document_id": document_id}


def _enforce_chat_rate_limit(tenant_id: str) -> None:
    """Persistent per-tenant request cap, shared across API workers."""
    limit = get_settings().chat_requests_per_minute
    if limit <= 0:
        return
    now = datetime.now(timezone.utc)
    with connect() as conn:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute("SELECT window_start, requests FROM chat_rate_limits WHERE tenant_id=?", (tenant_id,)).fetchone()
        within = bool(row and now - datetime.fromisoformat(row["window_start"]) < timedelta(minutes=1))
        count = row["requests"] if within else 0
        if count >= limit:
            remaining = max(1, int(60 - (now - datetime.fromisoformat(row["window_start"])).total_seconds()))
            raise HTTPException(status_code=429, detail="Chat request limit reached. Try again shortly.", headers={"Retry-After": str(remaining)})
        conn.execute("""INSERT INTO chat_rate_limits(tenant_id,window_start,requests) VALUES(?,?,?)
            ON CONFLICT(tenant_id) DO UPDATE SET window_start=excluded.window_start,requests=excluded.requests""",
            (tenant_id, row["window_start"] if within else now.isoformat(), count + 1))


def _conversation_history(conversation_id: str, tenant_id: str) -> list[dict[str, str]]:
    with connect() as conn:
        rows = conn.execute(
            """SELECT m.role, m.content FROM chat_messages m
               JOIN conversations c ON c.conversation_id = m.conversation_id
               WHERE m.conversation_id = ? AND c.tenant_id = ?
               ORDER BY m.created_at, m.rowid""", (conversation_id, tenant_id)
        ).fetchall()
    return [{"role": row[0], "content": row[1]} for row in rows[-12:]]


def _create_conversation(tenant_id: str) -> str:
    conversation_id = str(uuid4())
    with connect() as conn:
        conn.execute("INSERT INTO conversations (conversation_id, tenant_id) VALUES (?, ?)",
                     (conversation_id, tenant_id))
    return conversation_id


def _save_turn(conversation_id: str, question: str, answer: str) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO chat_messages (message_id, conversation_id, role, content) VALUES (?, ?, 'user', ?)",
            (str(uuid4()), conversation_id, question),
        )
        conn.execute(
            "INSERT INTO chat_messages (message_id, conversation_id, role, content) VALUES (?, ?, 'assistant', ?)",
            (str(uuid4()), conversation_id, answer),
        )
        conn.execute(
            "UPDATE conversations SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE conversation_id = ?",
            (conversation_id,),
        )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, client: Client = Depends(require_client)):
    tenant_id = client.tenant_id
    _enforce_chat_rate_limit(tenant_id)
    if request.conversation_id:
        with connect() as conn:
            exists = conn.execute(
                "SELECT 1 FROM conversations WHERE conversation_id = ? AND tenant_id = ?",
                (request.conversation_id, tenant_id),
            ).fetchone()
        if not exists:
            # Same response for unknown and another tenant's IDs; do not disclose existence.
            raise HTTPException(status_code=404, detail="Conversation not found.")
        conversation_id = request.conversation_id
        history = _conversation_history(conversation_id, tenant_id)
    else:
        conversation_id = _create_conversation(tenant_id)
        history = []

    greeting = greeting_response(request.question)
    if greeting is not None:
        _save_turn(conversation_id, request.question, greeting)
        return ChatResponse(conversation_id=conversation_id, answer=greeting, sources=[],
                            retrieval_count=0, model_provider="local")

    top_k = min(request.top_k or settings.default_top_k, settings.max_top_k)
    try:
        retrieval_question = request.question
        substantive_history = [
            item for item in history
            if item.get("role") == "user" and greeting_response(item.get("content", "")) is None
        ]
        if substantive_history:
            try:
                retrieval_question = await rewrite_retrieval_query(request.question, history)
            except Exception:
                logger.warning("Follow-up query rewriting failed; using original question.", exc_info=True)
        async with _embedding_limit:
            retrieved = await run_in_threadpool(retrieve, retrieval_question, top_k, tenant_id)
        response_sources = [
            SourceItem(source_id=f"S{i}", document_id=item["document_id"],
                       filename=item["filename"], chunk_index=item["chunk_index"],
                       heading=item["heading"], content=item["content"],
                       similarity=round(item["similarity"], 4))
            for i, item in enumerate(retrieved, start=1)
        ]
        answer, provider = await generate_answer(request.question, retrieved, history)
        _save_turn(conversation_id, request.question, answer)
        return ChatResponse(conversation_id=conversation_id, answer=answer, sources=response_sources,
                            retrieval_count=len(response_sources), model_provider=provider)
    except Exception as exc:
        logger.exception("Chat request failed")
        raise HTTPException(status_code=502, detail="Chat request failed. Please contact support.") from exc
