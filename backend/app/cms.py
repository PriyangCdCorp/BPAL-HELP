"""CMS API for Tips & Tricks and What's New.

The CMS stores editor content as structured JSON so the Electron renderer can
preserve the existing content model while supporting rich text and media.
"""
from __future__ import annotations

import json
import logging
import mimetypes
import re

import bleach
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field, field_validator, model_validator

from app.auth import Client, require_client
from app.admin_auth import require_cms_admin, AdminUser
from app.core.config import get_settings
from app.db import connect

logger = logging.getLogger(__name__)
admin_router = APIRouter(prefix="/admin/cms", tags=["CMS administration"], dependencies=[Depends(require_cms_admin)])
public_router = APIRouter(prefix="/content", tags=["Published help content"])

def _media_dir() -> Path:
    return Path(get_settings().cms_media_dir)


def _utc_dt(value: datetime) -> datetime:
    """UTC is the canonical representation for visibility comparisons in SQLite."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _utc_iso(value: datetime | None) -> str | None:
    return _utc_dt(value).isoformat() if value is not None else None
ALLOWED_MEDIA = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp", "image/gif"}

# Admin-authored rich text is rendered as HTML by the Help Center.
# Keep the same Word-like formatting while stripping scripts, event handlers,
# remote image URLs, unsafe CSS and non-CMS image links.
_HTML_TAGS = ["p", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i",
              "u", "s", "ul", "ol", "li", "blockquote", "pre", "code", "a",
              "img", "span", "div", "sub", "sup"]
_ALLOWED_CSS = ["font-family", "font-size", "line-height", "margin-top", "margin-bottom", "color", "background-color", "text-align"]
_MEDIA_URL_RE = re.compile(r"^/content/media/[0-9a-f-]{36}$", re.IGNORECASE)
_QUILL_CLASS_RE = re.compile(r"^(?:ql-(?:align-(?:left|center|right|justify)|indent-[1-8]|size-(?:small|large|huge))\s*)+$")


def _html_attr_allowed(tag: str, attr: str, value: str) -> bool:
    if attr == "style":
        return True
    if attr == "class":
        return bool(_QUILL_CLASS_RE.fullmatch(value))
    if tag == "a" and attr == "href":
        return value.strip().lower().startswith(("https://", "http://", "mailto:"))
    if tag == "img":
        if attr == "src":
            return bool(_MEDIA_URL_RE.fullmatch(value))
        return attr == "alt"
    return False


def _safe_rich_html(value: str) -> str:
    args = {"tags": _HTML_TAGS, "attributes": _html_attr_allowed, "strip": True,
            "protocols": ["http", "https", "mailto"]}
    try:
        from bleach.css_sanitizer import CSSSanitizer
    except ImportError:  # bleach 4.x compatibility for older development environments
        args["styles"] = _ALLOWED_CSS
    else:
        args["css_sanitizer"] = CSSSanitizer(allowed_css_properties=_ALLOWED_CSS)
    return bleach.clean(value, **args)


def _sanitize_rich_content(value):
    if isinstance(value, list):
        return [_sanitize_rich_content(part) for part in value]
    if isinstance(value, dict):
        return {key: (_safe_rich_html(item) if key in {"text", "html", "description"}
                      and isinstance(item, str) else _sanitize_rich_content(item))
                for key, item in value.items()}
    return value


class ContentCreate(BaseModel):
    content_type: str = Field(pattern="^(TIP|WHATS_NEW)$")
    scope: str = Field(default="GLOBAL", pattern="^(GLOBAL|TENANT|INTERNAL)$")
    tenant_id: str | None = None
    category: str | None = Field(default=None, max_length=120)
    sort_order: int = 0
    target_bpal_version: str | None = Field(default=None, max_length=80)
    visible_from: datetime | None = None
    visible_to: datetime | None = None
    translations: dict[str, dict] = Field(min_length=1)

    @field_validator("translations")
    @classmethod
    def validate_translations(cls, value):
        if not set(value).issubset({"en", "fr"}):
            raise ValueError("Translation keys must be 'en' and/or 'fr'.")
        for lang, item in value.items():
            if not isinstance(item, dict) or not str(item.get("title", "")).strip():
                raise ValueError(f"Translation '{lang}' must contain a non-empty title.")
        return value

    @field_validator("tenant_id")
    @classmethod
    def validate_scope_tenant(cls, value, info):
        scope = info.data.get("scope", "GLOBAL")
        if scope == "TENANT" and not value:
            raise ValueError("tenant_id is required for TENANT scope.")
        if scope != "TENANT" and value:
            raise ValueError("tenant_id is only valid for TENANT scope.")
        return value

    @model_validator(mode="after")
    def check_visibility_order(self):
        if self.visible_from and self.visible_to and _utc_dt(self.visible_to) < _utc_dt(self.visible_from):
            raise ValueError("visible_to must be later than visible_from.")
        return self


class ContentUpdate(BaseModel):
    category: str | None = Field(default=None, max_length=120)
    sort_order: int | None = None
    target_bpal_version: str | None = Field(default=None, max_length=80)
    visible_from: datetime | None = None
    visible_to: datetime | None = None
    translations: dict[str, dict] | None = None

    @field_validator("translations")
    @classmethod
    def validate_translations(cls, value):
        if value is None:
            return value
        if not value or not set(value).issubset({"en", "fr"}):
            raise ValueError("Provide one or more 'en'/'fr' translations.")
        for lang, item in value.items():
            if not isinstance(item, dict) or not str(item.get("title", "")).strip():
                raise ValueError(f"Translation '{lang}' must contain a non-empty title.")
        return value


def initialize_cms_database() -> None:
    with connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS help_content (
            content_id TEXT PRIMARY KEY,
            content_type TEXT NOT NULL CHECK(content_type IN ('TIP','WHATS_NEW')),
            scope TEXT NOT NULL CHECK(scope IN ('GLOBAL','TENANT','INTERNAL')),
            tenant_id TEXT,
            category TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            target_bpal_version TEXT,
            visible_from TEXT,
            visible_to TEXT,
            status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED')),
            created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            updated_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            published_at TEXT,
            created_by TEXT NOT NULL DEFAULT 'admin',
            updated_by TEXT NOT NULL DEFAULT 'admin',
            CHECK((scope='TENANT' AND tenant_id IS NOT NULL) OR (scope!='TENANT' AND tenant_id IS NULL))
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS help_content_translations (
            content_id TEXT NOT NULL REFERENCES help_content(content_id) ON DELETE CASCADE,
            language TEXT NOT NULL CHECK(language IN ('en','fr')),
            title TEXT NOT NULL,
            body_json TEXT NOT NULL DEFAULT '{}',
            PRIMARY KEY(content_id, language)
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS help_content_versions (
            version_id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL REFERENCES help_content(content_id) ON DELETE CASCADE,
            version_number INTEGER NOT NULL,
            snapshot_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            created_by TEXT NOT NULL DEFAULT 'admin',
            UNIQUE(content_id, version_number)
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS help_media (
            media_id TEXT PRIMARY KEY,
            original_filename TEXT NOT NULL,
            stored_filename TEXT NOT NULL UNIQUE,
            mime_type TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS help_content_media (
            content_id TEXT NOT NULL REFERENCES help_content(content_id) ON DELETE CASCADE,
            media_id TEXT NOT NULL REFERENCES help_media(media_id) ON DELETE CASCADE,
            PRIMARY KEY(content_id, media_id)
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS admin_audit_logs (
            audit_id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            content_id TEXT,
            details_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            actor TEXT NOT NULL DEFAULT 'admin'
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_help_content_visibility ON help_content(status, content_type, scope, tenant_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_help_content_translations_lang ON help_content_translations(language)")


def _snapshot(conn, content_id: str) -> dict:
    row = conn.execute("SELECT * FROM help_content WHERE content_id=?", (content_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Content not found.")
    translations = conn.execute("SELECT language,title,body_json FROM help_content_translations WHERE content_id=?", (content_id,)).fetchall()
    data = dict(row)
    data["translations"] = {r["language"]: {"title": r["title"], **_sanitize_rich_content(json.loads(r["body_json"]))} for r in translations}
    return data


def _audit(conn, action: str, content_id: str | None, details: dict | None = None, actor: str = "admin"):
    conn.execute("INSERT INTO admin_audit_logs(audit_id,action,content_id,details_json,actor) VALUES(?,?,?,?,?)",
                 (str(uuid4()), action, content_id, json.dumps(details or {}, ensure_ascii=False), actor))


def _save_translations(conn, content_id: str, translations: dict):
    for lang, value in translations.items():
        if lang not in ("en", "fr") or not isinstance(value, dict):
            raise HTTPException(status_code=400, detail="Invalid translation payload.")
        title = str(value.get("title", "")).strip()
        if not title:
            raise HTTPException(status_code=400, detail=f"Translation {lang} requires a title.")
        body = _sanitize_rich_content({k: v for k, v in value.items() if k != "title"})
        conn.execute("""INSERT INTO help_content_translations(content_id,language,title,body_json)
            VALUES(?,?,?,?) ON CONFLICT(content_id,language) DO UPDATE SET title=excluded.title,body_json=excluded.body_json""",
            (content_id, lang, title, json.dumps(body, ensure_ascii=False)))


def _serialize(row, language: str):
    data = dict(row)
    translations = json.loads(data.pop("translations_json"))
    selected = translations.get(language) or translations.get("en") or translations.get("fr")
    if selected is None:
        return None
    data["language"] = language if language in translations else ("en" if "en" in translations else "fr")
    data["title"] = selected["title"]
    body = selected.get("body", {})
    if isinstance(body, dict) and set(body) == {"body"}:
        body = body["body"]
    data["content"] = _sanitize_rich_content(body if isinstance(body, dict) else {"body": body})
    return data


@admin_router.get("/tenants")
def admin_list_tenants():
    with connect() as conn:
        rows = conn.execute("SELECT tenant_id,name FROM clients WHERE is_active=1 ORDER BY name COLLATE NOCASE").fetchall()
        return [dict(row) for row in rows]


@admin_router.get("/content")
def admin_list_content(status: str | None = None, content_type: str | None = None, scope: str | None = None):
    clauses, args = [], []
    for col, val in (("status", status), ("content_type", content_type), ("scope", scope)):
        if val:
            clauses.append(f"{col}=?"); args.append(val.upper())
    sql = "SELECT * FROM help_content" + (" WHERE " + " AND ".join(clauses) if clauses else "") + " ORDER BY updated_at DESC"
    with connect() as conn:
        rows = conn.execute(sql, args).fetchall()
        return [_snapshot(conn, r["content_id"]) for r in rows]


@admin_router.post("/content", status_code=201)
def admin_create_content(payload: ContentCreate, actor: AdminUser = Depends(require_cms_admin)):
    content_id = str(uuid4())
    with connect() as conn:
        if payload.scope == "TENANT":
            tenant = conn.execute("SELECT 1 FROM clients WHERE tenant_id=? AND is_active=1", (payload.tenant_id,)).fetchone()
            if not tenant:
                raise HTTPException(status_code=404, detail="Active tenant not found.")
        conn.execute("""INSERT INTO help_content(content_id,content_type,scope,tenant_id,category,sort_order,
            target_bpal_version,visible_from,visible_to) VALUES(?,?,?,?,?,?,?,?,?)""",
            (content_id,payload.content_type,payload.scope,payload.tenant_id,payload.category,payload.sort_order,
             payload.target_bpal_version,_utc_iso(payload.visible_from),
             _utc_iso(payload.visible_to)))
        _save_translations(conn, content_id, payload.translations)
        _audit(conn, "CREATE", content_id, {"type": payload.content_type, "scope": payload.scope}, actor=actor.admin_id)
        return _snapshot(conn, content_id)


@admin_router.get("/content/{content_id}")
def admin_get_content(content_id: str):
    with connect() as conn:
        return _snapshot(conn, content_id)


@admin_router.put("/content/{content_id}")
def admin_update_content(content_id: str, payload: ContentUpdate, actor: AdminUser = Depends(require_cms_admin)):
    changes = payload.model_dump(exclude_unset=True)
    with connect() as conn:
        current = conn.execute("SELECT status,visible_from,visible_to FROM help_content WHERE content_id=?", (content_id,)).fetchone()
        if not current:
            raise HTTPException(status_code=404, detail="Content not found.")
        proposed_start = changes.get("visible_from", current["visible_from"])
        proposed_end = changes.get("visible_to", current["visible_to"])
        start_dt = datetime.fromisoformat(proposed_start) if isinstance(proposed_start, str) else proposed_start
        end_dt = datetime.fromisoformat(proposed_end) if isinstance(proposed_end, str) else proposed_end
        if start_dt and end_dt and _utc_dt(end_dt) < _utc_dt(start_dt):
            raise HTTPException(status_code=400, detail="visible_to must be later than visible_from.")
        if current["status"] == "PUBLISHED":
            # Editing a published item returns it to draft, preventing silent live changes.
            conn.execute("UPDATE help_content SET status='DRAFT' WHERE content_id=?", (content_id,))
        fields = {k: v for k, v in changes.items() if k != "translations"}
        allowed = {"category", "sort_order", "target_bpal_version", "visible_from", "visible_to"}
        for key, value in fields.items():
            if key not in allowed: continue
            if key in ("visible_from", "visible_to") and value is not None: value = _utc_iso(value)
            conn.execute(f"UPDATE help_content SET {key}=? WHERE content_id=?", (value, content_id))
        if changes.get("translations"):
            _save_translations(conn, content_id, changes["translations"])
        conn.execute("UPDATE help_content SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE content_id=?", (content_id,))
        _audit(conn, "UPDATE", content_id, {"fields": list(changes)}, actor=actor.admin_id)
        return _snapshot(conn, content_id)


@admin_router.post("/content/{content_id}/publish")
def admin_publish_content(content_id: str, actor: AdminUser = Depends(require_cms_admin)):
    with connect() as conn:
        snapshot = _snapshot(conn, content_id)
        if not snapshot["translations"]:
            raise HTTPException(status_code=400, detail="Add at least one translation before publishing.")
        next_version = conn.execute("SELECT COALESCE(MAX(version_number),0)+1 FROM help_content_versions WHERE content_id=?", (content_id,)).fetchone()[0]
        conn.execute("INSERT INTO help_content_versions(version_id,content_id,version_number,snapshot_json) VALUES(?,?,?,?)",
                     (str(uuid4()), content_id, next_version, json.dumps(snapshot, ensure_ascii=False)))
        conn.execute("UPDATE help_content SET status='PUBLISHED',published_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE content_id=?", (content_id,))
        _audit(conn, "PUBLISH", content_id, {"version": next_version}, actor=actor.admin_id)
        return {"status": "PUBLISHED", "content_id": content_id, "version": next_version}


@admin_router.post("/content/{content_id}/archive")
def admin_archive_content(content_id: str, actor: AdminUser = Depends(require_cms_admin)):
    with connect() as conn:
        cur = conn.execute("UPDATE help_content SET status='ARCHIVED',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE content_id=?", (content_id,))
        if not cur.rowcount: raise HTTPException(status_code=404, detail="Content not found.")
        _audit(conn, "ARCHIVE", content_id, actor=actor.admin_id)
    return {"status": "ARCHIVED", "content_id": content_id}


@admin_router.get("/content/{content_id}/versions")
def admin_content_versions(content_id: str):
    with connect() as conn:
        if not conn.execute("SELECT 1 FROM help_content WHERE content_id=?", (content_id,)).fetchone():
            raise HTTPException(status_code=404, detail="Content not found.")
        rows = conn.execute("SELECT version_id,version_number,created_at,created_by FROM help_content_versions WHERE content_id=? ORDER BY version_number DESC", (content_id,)).fetchall()
        return [dict(r) for r in rows]


@admin_router.get("/audit-logs")
def admin_audit_logs(limit: int = Query(default=100, ge=1, le=500)):
    with connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()]


@admin_router.post("/media", status_code=201)
async def admin_upload_media(file: UploadFile = File(...), actor: AdminUser = Depends(require_cms_admin)):
    filename = Path(file.filename or "upload").name
    suffix = Path(filename).suffix.lower()
    mime = (file.content_type or mimetypes.guess_type(filename)[0] or "").lower()
    if suffix not in ALLOWED_MEDIA or mime not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, WEBP and GIF images are supported.")
    limit = get_settings().max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if not data: raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > limit: raise HTTPException(status_code=413, detail="Media exceeds upload size limit.")
    # Verify file signatures; do not trust extension/content-type alone.
    valid = ((mime == "image/png" and data.startswith(b"\x89PNG\r\n\x1a\n")) or
             (mime == "image/jpeg" and data.startswith(b"\xff\xd8\xff")) or
             (mime == "image/gif" and data[:6] in (b"GIF87a", b"GIF89a")) or
             (mime == "image/webp" and data[:4] == b"RIFF" and data[8:12] == b"WEBP"))
    if not valid: raise HTTPException(status_code=400, detail="File content does not match its image type.")
    _media_dir().mkdir(parents=True, exist_ok=True)
    media_id, stored = str(uuid4()), f"{uuid4().hex}{suffix}"
    (_media_dir() / stored).write_bytes(data)
    with connect() as conn:
        conn.execute("INSERT INTO help_media(media_id,original_filename,stored_filename,mime_type,size_bytes) VALUES(?,?,?,?,?)",
                     (media_id, filename, stored, mime, len(data)))
        _audit(conn, "MEDIA_UPLOAD", None, {"media_id": media_id, "filename": filename}, actor=actor.admin_id)
    return {"media_id": media_id, "filename": filename, "mime_type": mime, "size_bytes": len(data), "url": f"/content/media/{media_id}"}


@admin_router.get("/media/{media_id}")
def admin_preview_media(media_id: str):
    """Authenticated preview for draft media in the CMS editor."""
    from fastapi.responses import FileResponse
    with connect() as conn:
        row = conn.execute("SELECT * FROM help_media WHERE media_id=?", (media_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Media not found.")
    path = _media_dir() / row["stored_filename"]
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Media file not found.")
    return FileResponse(path, media_type=row["mime_type"], content_disposition_type="inline")


@admin_router.post("/content/{content_id}/media/{media_id}")
def admin_attach_media(content_id: str, media_id: str, actor: AdminUser = Depends(require_cms_admin)):
    with connect() as conn:
        if not conn.execute("SELECT 1 FROM help_content WHERE content_id=?", (content_id,)).fetchone(): raise HTTPException(404, "Content not found.")
        if not conn.execute("SELECT 1 FROM help_media WHERE media_id=?", (media_id,)).fetchone(): raise HTTPException(404, "Media not found.")
        conn.execute("INSERT OR IGNORE INTO help_content_media(content_id,media_id) VALUES(?,?)", (content_id, media_id))
        _audit(conn, "ATTACH_MEDIA", content_id, {"media_id": media_id}, actor=actor.admin_id)
    return {"status": "attached", "content_id": content_id, "media_id": media_id}


def _public_content(content_type: str, client: Client, language: str):
    now = datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        rows = conn.execute("""SELECT c.*, (SELECT json_group_object(t.language,json_object('title',t.title,'body',json(t.body_json)))
            FROM help_content_translations t WHERE t.content_id=c.content_id) AS translations_json
            FROM help_content c WHERE c.content_type=? AND c.status='PUBLISHED' AND c.scope IN ('GLOBAL','TENANT')
            AND (c.scope='GLOBAL' OR c.tenant_id=?)
            AND (c.visible_from IS NULL OR c.visible_from<=?) AND (c.visible_to IS NULL OR c.visible_to>=?)
            ORDER BY CASE WHEN c.scope='TENANT' THEN 0 ELSE 1 END, c.sort_order, c.published_at DESC""",
            (content_type, client.tenant_id, now, now)).fetchall()
        result = []
        for row in rows:
            item = _serialize(row, language)
            if item:
                media_rows = conn.execute("""SELECT m.media_id,m.original_filename,m.mime_type,m.size_bytes
                    FROM help_media m JOIN help_content_media cm ON cm.media_id=m.media_id
                    WHERE cm.content_id=? ORDER BY m.created_at""", (item["content_id"],)).fetchall()
                item["media"] = [{**dict(m), "url": f"/content/media/{m['media_id']}"} for m in media_rows]
                result.append(item)
        return result


@public_router.get("/tips")
def get_published_tips(language: str = Query(default="en", pattern="^(en|fr)$"), client: Client = Depends(require_client)):
    return _public_content("TIP", client, language)


@public_router.get("/whats-new")
def get_published_whats_new(language: str = Query(default="en", pattern="^(en|fr)$"), client: Client = Depends(require_client)):
    return _public_content("WHATS_NEW", client, language)


@public_router.get("/media/{media_id}")
def get_published_media(media_id: str, client: Client = Depends(require_client)):
    from fastapi.responses import FileResponse
    now = datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        row = conn.execute("""SELECT m.* FROM help_media m JOIN help_content_media cm ON cm.media_id=m.media_id
            JOIN help_content c ON c.content_id=cm.content_id WHERE m.media_id=? AND c.status='PUBLISHED'
            AND (c.scope='GLOBAL' OR (c.scope='TENANT' AND c.tenant_id=?))
            AND (c.visible_from IS NULL OR c.visible_from<=?)
            AND (c.visible_to IS NULL OR c.visible_to>=?) LIMIT 1""", (media_id, client.tenant_id, now, now)).fetchone()
    if not row: raise HTTPException(status_code=404, detail="Media not found.")
    path = _media_dir() / row["stored_filename"]
    if not path.is_file(): raise HTTPException(status_code=404, detail="Media file not found.")
    return FileResponse(path, media_type=row["mime_type"], filename=row["original_filename"], content_disposition_type="inline")
