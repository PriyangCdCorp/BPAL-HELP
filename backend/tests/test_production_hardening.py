"""Focused regressions for safe production-hardening changes."""
from datetime import datetime, timedelta, timezone
from io import BytesIO
import base64

from fastapi.testclient import TestClient

from app.auth import hash_api_key
from app.core.config import get_settings
from app.db import connect
from app.admin_auth import create_admin
import app.main as main

# Correctly encoded single-pixel PNG.
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV4sAAAAASUVORK5CYII=')


def _setup(tmp_path, monkeypatch):
    monkeypatch.setenv('DATABASE_PATH', str(tmp_path / 'prod.sqlite3'))
    monkeypatch.setenv('CMS_MEDIA_DIR', str(tmp_path / 'media'))
    get_settings.cache_clear()


def _login(client):
    create_admin('admin@example.test', 'Admin', 'A-Valid-Passphrase-2026')
    r = client.post('/admin-auth/login', json={'email':'admin@example.test', 'password':'A-Valid-Passphrase-2026'})
    assert r.status_code == 200, r.text
    return {'Authorization': 'Bearer ' + r.json()['access_token']}, r.json()['user']['admin_id']


def test_media_is_only_served_when_published_content_is_currently_visible(tmp_path, monkeypatch):
    _setup(tmp_path, monkeypatch)
    with TestClient(main.app) as client:
        with connect() as conn:
            conn.execute('INSERT INTO clients(tenant_id,name,api_key_hash) VALUES (?,?,?)', ('a', 'A', hash_api_key('key-a')))
            conn.execute('INSERT INTO clients(tenant_id,name,api_key_hash) VALUES (?,?,?)', ('b', 'B', hash_api_key('key-b')))
        admin, admin_id = _login(client)
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        r = client.post('/admin/cms/content', headers=admin, json={
            'content_type':'TIP','scope':'TENANT','tenant_id':'a', 'visible_from':future,
            'translations':{'en':{'title':'Help','body':{'steps':[]}}},
        })
        assert r.status_code == 201, r.text
        item_id=r.json()['content_id']
        up=client.post('/admin/cms/media',headers=admin,files={'file':('a.png',BytesIO(PNG),'image/png')})
        assert up.status_code == 201, up.text
        mid=up.json()['media_id']
        attach=client.post(f'/admin/cms/content/{item_id}/media/{mid}',headers=admin)
        assert attach.status_code == 200, attach.text
        assert client.post(f'/admin/cms/content/{item_id}/publish',headers=admin).status_code==200
        key_a={'Authorization':'Bearer key-a'}
        key_b={'Authorization':'Bearer key-b'}
        assert client.get(f'/content/media/{mid}',headers=key_a).status_code==404
        assert client.get('/content/tips',headers=key_a).json()==[]
        assert client.get(f'/content/media/{mid}',headers=key_b).status_code==404
        change=client.put(f'/admin/cms/content/{item_id}',headers=admin,json={'visible_from':past})
        assert change.status_code==200
        assert client.post(f'/admin/cms/content/{item_id}/publish',headers=admin).status_code==200
        assert client.get(f'/content/media/{mid}',headers=key_a).status_code==200
        assert client.get(f'/content/media/{mid}',headers=key_b).status_code==404
        with connect() as conn:
            audit=conn.execute('SELECT actor FROM admin_audit_logs WHERE content_id=? AND action=\'PUBLISH\' ORDER BY created_at DESC LIMIT 1',(item_id,)).fetchone()
        assert audit['actor']==admin_id
    get_settings.cache_clear()


def test_admin_login_throttled_after_failed_passwords(tmp_path,monkeypatch):
    _setup(tmp_path,monkeypatch)
    with TestClient(main.app) as client:
        for i in range(10):
            response=client.post('/admin-auth/login',json={'email':'missing@example.test','password':'wrong'})
            assert response.status_code==401,(i,response.text)
        response=client.post('/admin-auth/login',json={'email':'missing@example.test','password':'wrong'})
        assert response.status_code==429,response.text
        assert response.headers.get('Retry-After')=='900'
    get_settings.cache_clear()


def test_chat_requests_are_rate_limited_per_tenant(tmp_path, monkeypatch):
    _setup(tmp_path, monkeypatch)
    monkeypatch.setenv('CHAT_REQUESTS_PER_MINUTE', '2')
    get_settings.cache_clear()
    with TestClient(main.app) as client:
        with connect() as conn:
            conn.execute('INSERT INTO clients(tenant_id,name,api_key_hash) VALUES (?,?,?)', ('a', 'A', hash_api_key('key-a')))
            conn.execute('INSERT INTO clients(tenant_id,name,api_key_hash) VALUES (?,?,?)', ('b', 'B', hash_api_key('key-b')))
        auth_a={'Authorization':'Bearer key-a'}
        for _ in range(2):
            r=client.post('/chat', headers=auth_a, json={'question':'hello'})
            assert r.status_code==200,r.text
            assert r.headers['Cache-Control']=='no-store'
            assert r.headers['X-Content-Type-Options']=='nosniff'
        blocked=client.post('/chat', headers=auth_a, json={'question':'hello'})
        assert blocked.status_code==429,blocked.text
        assert int(blocked.headers['Retry-After'])>0
        # Other tenants get their own budget.
        allowed=client.post('/chat', headers={'Authorization':'Bearer key-b'}, json={'question':'hello'})
        assert allowed.status_code==200,allowed.text
    get_settings.cache_clear()


def test_cms_rich_text_strips_unsafe_markup_preserving_quill_format(tmp_path, monkeypatch):
    _setup(tmp_path,monkeypatch)
    with TestClient(main.app) as client:
        with connect() as conn:
            conn.execute('INSERT INTO clients(tenant_id,name,api_key_hash) VALUES (?,?,?)', ('a', 'A', hash_api_key('key-a')))
        admin, _ = _login(client)
        unsafe='<p style="line-height:1.5;position:absolute"><strong>Hello</strong> <img src="javascript:alert(1)" onerror="alert(1)"><script>alert(1)</script></p>'
        r=client.post('/admin/cms/content',headers=admin,json={
            'content_type':'WHATS_NEW', 'scope':'GLOBAL',
            'translations':{'en':{'title':'Notes','body':{'html':unsafe}}}
        })
        assert r.status_code==201,r.text
        body=r.json()['translations']['en']['body']['html']
        assert '<strong>Hello</strong>' in body
        assert 'line-height: 1.5' in body or 'line-height:1.5' in body
        assert 'position:absolute' not in body
        assert '<script' not in body and 'onerror' not in body and 'javascript:' not in body
        assert client.post(f'/admin/cms/content/{r.json()["content_id"]}/publish',headers=admin).status_code==200
        published=client.get('/content/whats-new',headers={'Authorization':'Bearer key-a'})
        assert published.status_code==200
        assert '<script' not in published.json()[0]['content']['html']
    get_settings.cache_clear()


def test_visibility_dates_are_normalized_to_utc_and_checked(tmp_path,monkeypatch):
    _setup(tmp_path,monkeypatch)
    with TestClient(main.app) as client:
        admin, _ = _login(client)
        invalid=client.post('/admin/cms/content',headers=admin,json={
            'content_type':'WHATS_NEW','scope':'GLOBAL',
            'visible_from':'2030-01-02T12:00:00+05:30',
            'visible_to':'2030-01-01T00:00:00+05:30',
            'translations':{'en':{'title':'No','body':{'html':'<p>test</p>'}}}})
        assert invalid.status_code==422
        valid=client.post('/admin/cms/content',headers=admin,json={
            'content_type':'WHATS_NEW','scope':'GLOBAL',
            'visible_from':'2030-01-01T05:30:00+05:30',
            'translations':{'en':{'title':'Valid','body':{'html':'<p>hello</p>'}}}})
        assert valid.status_code==201,valid.text
        assert valid.json()['visible_from']=='2030-01-01T00:00:00+00:00'
    get_settings.cache_clear()
