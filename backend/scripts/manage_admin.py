"""Local CLI for administrator account operations; no passwords in shell arguments.

Examples:
    python scripts/manage_admin.py list
    python scripts/manage_admin.py disable --email admin@example.com
    python scripts/manage_admin.py reset-password --email admin@example.com
    python scripts/manage_admin.py role --email admin@example.com --role VIEWER
"""
from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import connect, initialize_database
from app.admin_auth import initialize_admin_auth_database, _hash_password


def main():
    parser = argparse.ArgumentParser(description="Manage BPAL CMS administrator accounts locally")
    parser.add_argument("command", choices=("list", "disable", "enable", "role", "reset-password"))
    parser.add_argument("--email", help="Administrator email (all commands except list)")
    parser.add_argument("--role", choices=("ADMIN", "EDITOR", "VIEWER"))
    args = parser.parse_args()
    initialize_database()
    initialize_admin_auth_database()
    if args.command == "list":
        with connect() as conn:
            rows=conn.execute("SELECT email,display_name,role,is_active FROM admin_users ORDER BY email").fetchall()
        for row in rows:
            print(f"{row['email']}  {row['role']}  {'active' if row['is_active'] else 'disabled'}")
        return
    if not args.email:
        parser.error("--email is required for this command")
    if args.command == "role" and not args.role:
        parser.error("--role is required when changing a role")
    email=args.email.strip().lower()
    password_hash=None
    if args.command == "reset-password":
        password=getpass.getpass("New password (12+ characters): ")
        confirm=getpass.getpass("Confirm password: ")
        if password != confirm:
            raise SystemExit("Passwords do not match")
        if len(password)<12:
            raise SystemExit("Password must be at least 12 characters")
        password_hash=_hash_password(password)
    with connect() as conn:
        record=conn.execute("SELECT admin_id, role FROM admin_users WHERE email=?",(email,)).fetchone()
        if not record:
            raise SystemExit("Administrator not found")
        if args.command == "disable":
            if record['role']=='ADMIN':
                remaining=conn.execute("SELECT count(*) FROM admin_users WHERE role='ADMIN' AND is_active=1 AND admin_id!=?",(record['admin_id'],)).fetchone()[0]
                if not remaining: raise SystemExit("Cannot disable the last active ADMIN account")
            conn.execute("UPDATE admin_users SET is_active=0 WHERE admin_id=?",(record['admin_id'],))
        elif args.command == "enable":
            conn.execute("UPDATE admin_users SET is_active=1 WHERE admin_id=?",(record['admin_id'],))
        elif args.command == "role":
            if record['role']=='ADMIN' and args.role != 'ADMIN':
                remaining=conn.execute("SELECT count(*) FROM admin_users WHERE role='ADMIN' AND is_active=1 AND admin_id!=?",(record['admin_id'],)).fetchone()[0]
                if not remaining: raise SystemExit("Cannot demote the last active ADMIN account")
            conn.execute("UPDATE admin_users SET role=? WHERE admin_id=?",(args.role,record['admin_id']))
        elif args.command == "reset-password":
            conn.execute("UPDATE admin_users SET password_hash=? WHERE admin_id=?",(password_hash,record['admin_id']))
        conn.execute("UPDATE admin_users SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE admin_id=?",(record['admin_id'],))
        # Revocation takes effect on next request.
        conn.execute("DELETE FROM admin_sessions WHERE admin_id=?",(record['admin_id'],))
    print(f"Administrator operation complete: {args.command} ({email}). Sessions revoked.")


if __name__ == "__main__":
    main()
