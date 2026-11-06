from fastapi.testclient import TestClient
from app.core.config import get_settings
import app.main as main


def test_individual_admin_login_roles_and_logout(tmp_path, monkeypatch):
    monkeypatch.setenv('DATABASE_PATH', str(tmp_path / 'admin-auth.sqlite3'))
    get_settings.cache_clear()
    from app.admin_auth import create_admin
    with TestClient(main.app) as client:
        create_admin('editor@example.test', 'Content Editor', 'Very-Strong-Test-Password-123', 'EDITOR')
        bad = client.post('/admin-auth/login', json={'email':'editor@example.test','password':'wrong-password'})
        assert bad.status_code == 401
        login = client.post('/admin-auth/login', json={'email':'editor@example.test','password':'Very-Strong-Test-Password-123'})
        assert login.status_code == 200, login.text
        token = login.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        assert client.get('/admin-auth/me', headers=headers).json()['role'] == 'EDITOR'
        # Editor can create content.
        created = client.post('/admin/cms/content', headers=headers, json={
            'content_type':'TIP','scope':'GLOBAL',
            'translations':{'en':{'title':'Test tip','body':{'html':'<p>Hello</p>'}}}
        })
        assert created.status_code == 201, created.text
        assert client.post('/admin-auth/logout', headers=headers).status_code == 200
        assert client.get('/admin-auth/me', headers=headers).status_code == 401
    get_settings.cache_clear()


def test_viewer_is_read_only(tmp_path, monkeypatch):
    monkeypatch.setenv('DATABASE_PATH', str(tmp_path / 'viewer.sqlite3'))
    get_settings.cache_clear()
    from app.admin_auth import create_admin
    with TestClient(main.app) as client:
        create_admin('viewer@example.test', 'Read Only', 'Another-Strong-Password-456', 'VIEWER')
        login = client.post('/admin-auth/login', json={'email':'viewer@example.test','password':'Another-Strong-Password-456'})
        headers = {'Authorization': f"Bearer {login.json()['access_token']}"}
        assert client.get('/admin/cms/content', headers=headers).status_code == 200
        assert client.post('/admin/cms/content', headers=headers, json={
            'content_type':'TIP','scope':'GLOBAL','translations':{'en':{'title':'Nope'}}
        }).status_code == 403
    get_settings.cache_clear()
