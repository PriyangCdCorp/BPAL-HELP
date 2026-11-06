from fastapi.testclient import TestClient
from app.core.config import get_settings
from app.admin_auth import create_admin
from app.auth import hash_api_key
from app.db import connect
import app.main as main


def test_cms_client_management_session_and_key_lifecycle(tmp_path, monkeypatch):
    monkeypatch.setenv('DATABASE_PATH', str(tmp_path / 'clients.sqlite3'))
    get_settings.cache_clear()
    with TestClient(main.app) as client:
        create_admin('admin@example.test','Administrator','Very-Strong-Test-Password-123','ADMIN')
        create_admin('editor@example.test','Editor','Very-Strong-Test-Password-123','EDITOR')
        def login(email):
            result=client.post('/admin-auth/login',json={'email':email,'password':'Very-Strong-Test-Password-123'})
            assert result.status_code==200
            return {'Authorization':'Bearer '+result.json()['access_token']}
        admin=login('admin@example.test'); editor=login('editor@example.test')
        assert client.get('/admin/cms/clients').status_code==401
        assert client.get('/admin/cms/clients',headers=editor).status_code==403
        assert client.post('/admin/cms/clients',headers=editor,json={'name':'No'}).status_code==403
        assert client.post('/admin/cms/clients',headers=admin,json={'name':'   '}).status_code==422
        r=client.post('/admin/cms/clients',headers=admin,json={'name':'  Alpha  '})
        assert r.status_code==201,r.text
        data=r.json(); tenant=data['tenant_id']; old=data['api_key']
        assert data['name']=='Alpha'
        assert 'api_key' not in client.get('/admin/cms/clients',headers=admin).json()[0]
        with connect() as conn:
            row=conn.execute('SELECT api_key_hash FROM clients WHERE tenant_id=?',(tenant,)).fetchone()
            assert row['api_key_hash']==hash_api_key(old)
        assert client.patch(f'/admin/cms/clients/{tenant}',headers=admin,json={'name':'Beta'}).status_code==200
        assert client.patch(f'/admin/cms/clients/{tenant}/status?enabled=false',headers=admin).status_code==200
        assert client.post(f'/admin/cms/clients/{tenant}/rotate-key',headers=admin).status_code==404
        assert client.patch(f'/admin/cms/clients/{tenant}/status?enabled=true',headers=admin).status_code==200
        r=client.post(f'/admin/cms/clients/{tenant}/rotate-key',headers=admin)
        assert r.status_code==200
        assert r.json()['api_key']!=old
        with connect() as conn:
            assert conn.execute('SELECT api_key_hash FROM clients WHERE tenant_id=?',(tenant,)).fetchone()['api_key_hash']==hash_api_key(r.json()['api_key'])
    get_settings.cache_clear()
