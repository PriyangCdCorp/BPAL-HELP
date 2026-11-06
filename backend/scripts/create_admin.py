"""Create the first CMS administrator from an interactive local terminal."""
import getpass
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db import initialize_database
from app.cms import initialize_cms_database
from app.admin_auth import initialize_admin_auth_database, create_admin

initialize_database(); initialize_cms_database(); initialize_admin_auth_database()
email = input("Administrator email: ").strip()
name = input("Display name: ").strip()
password = getpass.getpass("Password (minimum 12 characters): ")
confirm = getpass.getpass("Confirm password: ")
if password != confirm:
    raise SystemExit("Passwords do not match.")
role = input("Role [ADMIN/EDITOR/VIEWER] (default ADMIN): ").strip().upper() or "ADMIN"
try:
    create_admin(email, name, password, role)
except Exception as exc:
    raise SystemExit(f"Could not create administrator: {exc}")
print(f"Created {role} administrator: {email}")
