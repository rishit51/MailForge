import os
import os
os.environ["ASYNC_DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db"
os.environ["SYNC_DATABASE_URL"] = "postgresql+psycopg2://postgres:postgres@localhost:5432/test_db"

import pytest
import httpx
from fastapi.testclient import TestClient
from app import app
from unittest.mock import Mock

from dotenv import load_dotenv
from celery.contrib.testing import worker
from db.db_connection import SyncSessionLocal,AsyncSessionLocal
load_dotenv()
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import sessionmaker



@pytest.fixture(autouse=True)
def test_env():
    os.environ["ASYNC_DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db"
    os.environ["SYNC_DATABASE_URL"] = "postgresql+psycopg2://postgres:postgres@localhost:5432/test_db"
    

        
    
@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
async def async_client():
    async with httpx.AsyncClient(app=app, base_url="http://test") as c:
        yield c

@pytest.fixture(scope="session")
def celery_worker():
    # Mock Celery worker for tests
    with worker(app=app.celery_app, hostname='celery@tests'):
        yield

@pytest.fixture(autouse=True)
def setup_test_db():
    # Cleanup uploads
    if os.path.exists('uploads'):
        for f in os.listdir('uploads'):
            os.remove(os.path.join('uploads', f))

