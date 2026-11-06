import hashlib
import secrets
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.db import connect

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Client:
    tenant_id: str
    name: str


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def create_api_key() -> str:
    return "rag_" + secrets.token_urlsafe(36)


async def require_client(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> Client:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="A valid client API key is required.")
    key_hash = hash_api_key(credentials.credentials)
    with connect() as conn:
        row = conn.execute(
            "SELECT tenant_id, name FROM clients WHERE api_key_hash = ? AND is_active = 1",
            (key_hash,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or inactive client API key.")
    return Client(tenant_id=row["tenant_id"], name=row["name"])


async def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    configured = get_settings().admin_api_key
    if not configured:
        raise HTTPException(status_code=503, detail="Administrator access is not configured.")
    if not x_admin_key or not secrets.compare_digest(x_admin_key, configured):
        raise HTTPException(status_code=403, detail="Administrator access required.")
