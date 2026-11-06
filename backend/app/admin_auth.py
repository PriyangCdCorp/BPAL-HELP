"""Individual CMS administrator accounts and opaque bearer sessions."""
from __future__ import annotations
import hashlib, hmac, secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from app.db import connect

router = APIRouter(prefix="/admin-auth", tags=["CMS administrator authentication"])
SESSION_HOURS = 8
ITERATIONS = 310_000
LOGIN_MAX_FAILURES = 10
LOGIN_WINDOW_MINUTES = 15

class LoginPayload(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)

class AdminUser(BaseModel):
    admin_id: str
    email: str
    display_name: str
    role: str

def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${salt.hex()}${digest.hex()}"

def _verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, iterations, salt_hex, digest_hex = encoded.split("$")
        if scheme != "pbkdf2_sha256": return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations)).hex()
        return hmac.compare_digest(actual, digest_hex)
    except Exception:
        return False

def initialize_admin_auth_database():
    with connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS admin_users(
            admin_id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            display_name TEXT NOT NULL, password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('ADMIN','EDITOR','VIEWER')),
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            updated_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS admin_sessions(
            session_id TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admin_users(admin_id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            last_seen_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at)")
        conn.execute("""CREATE TABLE IF NOT EXISTS admin_login_attempts(
            identity_hash TEXT PRIMARY KEY, failures INTEGER NOT NULL,
            window_start TEXT NOT NULL
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_admin_login_window ON admin_login_attempts(window_start)")

def create_admin(email: str, display_name: str, password: str, role: str = "ADMIN"):
    from uuid import uuid4
    email = email.strip().lower(); display_name = display_name.strip(); role = role.upper()
    if role not in {"ADMIN", "EDITOR", "VIEWER"}: raise ValueError("role must be ADMIN, EDITOR or VIEWER")
    if len(password) < 12: raise ValueError("Password must be at least 12 characters")
    with connect() as conn:
        conn.execute("INSERT INTO admin_users(admin_id,email,display_name,password_hash,role) VALUES(?,?,?,?,?)",
                     (str(uuid4()), email, display_name, _hash_password(password), role))

def _get_bearer(authorization: str | None):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Administrator login required.")
    return authorization[7:].strip()

async def require_cms_admin(request: Request, authorization: str | None = Header(default=None)) -> AdminUser:
    token = _get_bearer(authorization)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = datetime.now(timezone.utc)
    with connect() as conn:
        row = conn.execute("""SELECT u.admin_id,u.email,u.display_name,u.role,u.is_active,s.session_id,s.expires_at
            FROM admin_sessions s JOIN admin_users u ON u.admin_id=s.admin_id
            WHERE s.token_hash=?""", (token_hash,)).fetchone()
        if not row or not row["is_active"] or datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00")) <= now:
            if row: conn.execute("DELETE FROM admin_sessions WHERE session_id=?", (row["session_id"],))
            raise HTTPException(status_code=401, detail="Administrator session expired or invalid.")
        if row["role"] == "VIEWER" and request.method not in ("GET", "HEAD"):
            raise HTTPException(status_code=403, detail="Viewer role is read-only.")
        conn.execute("UPDATE admin_sessions SET last_seen_at=? WHERE session_id=?", (now.isoformat(), row["session_id"]))
    return AdminUser(admin_id=row["admin_id"], email=row["email"], display_name=row["display_name"], role=row["role"])

@router.post("/login")
def login(payload: LoginPayload, request: Request):
    email = payload.email.strip().lower()
    # Rate limit per admin identity and client IP. The reverse proxy must also apply
    # a global IP rate limit; don't trust unvalidated X-Forwarded-For headers here.
    address = request.client.host if request.client else "unknown"
    identity = hashlib.sha256(f"{address}|{email}".encode()).hexdigest()
    now = datetime.now(timezone.utc)
    with connect() as conn:
        conn.execute("DELETE FROM admin_login_attempts WHERE window_start < ?", ((now - timedelta(hours=24)).isoformat(),))
        attempts = conn.execute("SELECT failures, window_start FROM admin_login_attempts WHERE identity_hash=?", (identity,)).fetchone()
        if attempts:
            window_start = datetime.fromisoformat(attempts["window_start"])
            if now - window_start < timedelta(minutes=LOGIN_WINDOW_MINUTES) and attempts["failures"] >= LOGIN_MAX_FAILURES:
                raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.", headers={"Retry-After": "900"})
        row = conn.execute("SELECT * FROM admin_users WHERE email=? AND is_active=1", (email,)).fetchone()
    if not row or not _verify_password(payload.password, row["password_hash"]):
        with connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            record = conn.execute("SELECT failures,window_start FROM admin_login_attempts WHERE identity_hash=?", (identity,)).fetchone()
            within = bool(record and now - datetime.fromisoformat(record["window_start"]) < timedelta(minutes=LOGIN_WINDOW_MINUTES))
            failures = record["failures"] + 1 if within else 1
            start = record["window_start"] if within else now.isoformat()
            conn.execute("INSERT INTO admin_login_attempts(identity_hash,failures,window_start) VALUES(?,?,?) ON CONFLICT(identity_hash) DO UPDATE SET failures=excluded.failures,window_start=excluded.window_start", (identity, failures, start))
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    with connect() as conn:
        conn.execute("DELETE FROM admin_login_attempts WHERE identity_hash=?", (identity,))
    from uuid import uuid4
    token = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)
    with connect() as conn:
        conn.execute("INSERT INTO admin_sessions(session_id,admin_id,token_hash,expires_at) VALUES(?,?,?,?)",
                     (str(uuid4()), row["admin_id"], hashlib.sha256(token.encode()).hexdigest(), expires.isoformat()))
    return {"access_token": token, "token_type": "bearer", "expires_at": expires.isoformat(),
            "user": {"admin_id": row["admin_id"], "email": row["email"], "display_name": row["display_name"], "role": row["role"]}}

@router.get("/me")
def me(user: AdminUser = Depends(require_cms_admin)):
    return user.model_dump()

@router.post("/logout")
def logout(authorization: str | None = Header(default=None)):
    token = _get_bearer(authorization)
    with connect() as conn:
        conn.execute("DELETE FROM admin_sessions WHERE token_hash=?", (hashlib.sha256(token.encode()).hexdigest(),))
    return {"status": "logged_out"}
