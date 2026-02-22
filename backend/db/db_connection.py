import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from contextlib import contextmanager

# Absolute path resolution
BASE_DIR = os.path.dirname(os.path.abspath(__file__))   # db/
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))  # backend/
DB_PATH = os.path.join(PROJECT_ROOT, "app.db")

ASYNC_DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"
SYNC_DATABASE_URL = f"sqlite:///{DB_PATH}"

# Async engine (FastAPI)
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
)

# Sync engine (Celery)
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Session factories
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

# FastAPI dependency
async def get_db():
    async with AsyncSessionLocal() as db:
        yield db

# Celery / sync usage
@contextmanager
def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()
