from fastapi.testclient import TestClient

from app.core.config import get_settings
import app.main as main


def test_cms_publish_translation_and_tenant_isolation(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "cms.sqlite3"))
    get_settings.cache_clear()
    from app.auth import hash_api_key
    from app.db import connect

    with TestClient(main.app) as client:
        with connect() as conn:
            conn.execute("INSERT INTO clients(tenant_id,name,api_key_hash) VALUES(?,?,?)",
                         ("tenant-a", "A", hash_api_key("client-a")))
            conn.execute("INSERT INTO clients(tenant_id,name,api_key_hash) VALUES(?,?,?)",
                         ("tenant-b", "B", hash_api_key("client-b")))
        from app.admin_auth import create_admin
        create_admin("admin@example.test", "Test Admin", "Correct-Horse-Battery-42")
        token = client.post("/admin-auth/login", json={"email": "admin@example.test", "password": "Correct-Horse-Battery-42"}).json()["access_token"]
        admin = {"Authorization": f"Bearer {token}"}
        created = client.post("/admin/cms/content", headers=admin, json={
            "content_type": "TIP", "scope": "TENANT", "tenant_id": "tenant-a",
            "category": "Getting Started",
            "translations": {
                "en": {"title": "Create a folder", "body": {"steps": ["Open BPAL", "Select New Folder"]}},
                "fr": {"title": "Créer un dossier", "body": {"steps": ["Ouvrir BPAL"]}}
            }
        })
        assert created.status_code == 201, created.text
        content_id = created.json()["content_id"]
        published = client.post(f"/admin/cms/content/{content_id}/publish", headers=admin)
        assert published.status_code == 200, published.text
        a = client.get("/content/tips?language=en", headers={"Authorization": "Bearer client-a"})
        b = client.get("/content/tips?language=en", headers={"Authorization": "Bearer client-b"})
        fr = client.get("/content/tips?language=fr", headers={"Authorization": "Bearer client-a"})
        assert a.status_code == b.status_code == fr.status_code == 200
        assert len(a.json()) == 1
        assert a.json()[0]["title"] == "Create a folder"
        assert a.json()[0]["content"]["steps"][0] == "Open BPAL"
        assert b.json() == []
        assert fr.json()[0]["title"] == "Créer un dossier"
        versions = client.get(f"/admin/cms/content/{content_id}/versions", headers=admin)
        assert versions.status_code == 200 and versions.json()[0]["version_number"] == 1
        assert client.get("/content/tips", headers={"Authorization": "Bearer invalid"}).status_code == 401
    get_settings.cache_clear()


def test_global_content_visible_to_all_active_tenants(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "cms-global.sqlite3"))
    get_settings.cache_clear()
    from app.auth import hash_api_key
    from app.db import connect
    with TestClient(main.app) as client:
        with connect() as conn:
            for tenant, key in (("tenant-a", "key-a"), ("tenant-b", "key-b")):
                conn.execute("INSERT INTO clients(tenant_id,name,api_key_hash) VALUES(?,?,?)",
                             (tenant, tenant, hash_api_key(key)))
        from app.admin_auth import create_admin
        create_admin("admin@example.test", "Test Admin", "Correct-Horse-Battery-42")
        token = client.post("/admin-auth/login", json={"email": "admin@example.test", "password": "Correct-Horse-Battery-42"}).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        created = client.post("/admin/cms/content", headers=headers, json={
            "content_type": "WHATS_NEW", "scope": "GLOBAL",
            "translations": {"en": {"title": "Version 4.0", "body": {"version": "4.0"}}}
        })
        assert created.status_code == 201, created.text
        content_id = created.json()["content_id"]
        assert client.post(f"/admin/cms/content/{content_id}/publish", headers=headers).status_code == 200
        for key in ("key-a", "key-b"):
            response = client.get("/content/whats-new", headers={"Authorization": f"Bearer {key}"})
            assert response.status_code == 200 and response.json()[0]["title"] == "Version 4.0"
    get_settings.cache_clear()
