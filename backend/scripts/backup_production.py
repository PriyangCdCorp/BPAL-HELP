"""Offline-friendly SQLite + CMS media backup.

Run in a maintenance window (no writes) for a consistent database+media snapshot.
Example: python scripts/backup_production.py --destination D:/BPALBackups
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import get_settings


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def backup(destination: Path) -> Path:
    settings = get_settings()
    db_path = Path(settings.database_path)
    if not db_path.is_file():
        raise FileNotFoundError(f"SQLite database not found: {db_path}")
    destination.mkdir(parents=True, exist_ok=True)
    name = "bpal-backup-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
    out = destination / name
    out.mkdir()
    try:
        backup_path = out / "rag.sqlite3"
        with sqlite3.connect(str(db_path)) as source, sqlite3.connect(str(backup_path)) as target:
            source.backup(target)
        with sqlite3.connect(str(backup_path)) as saved:
            integrity = saved.execute("PRAGMA integrity_check").fetchone()[0]
            if integrity != "ok":
                raise RuntimeError(f"SQLite backup integrity check failed: {integrity}")
        for key, src in (("cms_media", Path(settings.cms_media_dir)),
                         ("uploads", Path(settings.document_upload_dir))):
            if src.exists():
                shutil.copytree(src, out / key)
        manifest = {"created_at": datetime.now(timezone.utc).isoformat(),
                    "database_sha256": file_sha256(backup_path),
                    "database_bytes": backup_path.stat().st_size,
                    "media_files": 0, "uploads_files": 0}
        for kind in ("cms_media", "uploads"):
            if (out / kind).exists():
                manifest[kind + "_files"] = sum(p.is_file() for p in (out / kind).rglob("*"))
        (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        return out
    except Exception:
        shutil.rmtree(out, ignore_errors=True)
        raise


def main():
    parser = argparse.ArgumentParser(description="Back up BPAL SQLite and CMS media")
    parser.add_argument("--destination", type=Path, required=True, help="Directory that will contain timestamped backups")
    args = parser.parse_args()
    print("Stop API writes during backup, or ensure maintenance mode is enabled.")
    print("Backup created:", backup(args.destination))


if __name__ == "__main__":
    main()
