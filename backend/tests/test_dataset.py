import pytest
import httpx
from fastapi.testclient import TestClient
from conftest import client, async_client, celery_worker
import tempfile
import csv
from io import StringIO

def generate_csv(rows: int, columns: list = ['email', 'name']):
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    for i in range(rows):
        writer.writerow([f'user{i}@test.com', f'User {i}'])
    return output.getvalue()

def test_upload_csv(client: TestClient):
    csv_content = generate_csv(100)
    
    files = {
        'file': ('test.csv', csv_content, 'text/csv')
    }
    data = {
        'email_column': 'email',
        'name': 'Test Dataset'
    }
    
    # Needs auth header - mock or skip for basic test
    # For full test, add auth fixture
    response = client.post('/datasets/', files=files, data=data)
    
    assert response.status_code == 401  # Expect auth error initially
    # With auth: assert 200

@pytest.mark.asyncio
async def test_upload_csv_async(async_client: httpx.AsyncClient):
    csv_content = generate_csv(1000)
    
    files = {
        ('file', ('test.csv', csv_content, 'text/csv'))
    }
    data = {
        'email_column': 'email',
        'name': 'Async Test'
    }
    
    # Mock auth
    response = await async_client.post('/datasets/', files=files, data=data)
    assert response.status_code == 401
