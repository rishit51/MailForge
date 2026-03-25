import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Database
    ASYNC_DATABASE_URL: str = os.getenv("ASYNC_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/emailsender")
    SYNC_DATABASE_URL: str = os.getenv("SYNC_DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/emailsender")
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-only-fallback-change-me")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    OAUTH_SECRET: str = os.getenv("OAUTH_SECRET", "change-me")
    
    # Celery
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "pyamqp://guest:guest@localhost:5672//")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
    
    # Third Party / Integrations
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    COHERE_API_KEY: str = os.getenv("COHERE_API_KEY", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Redis
    REDIS_URL:str = os.getenv("REDIS_URL", "redis://localhost:6379/1")

settings = Settings()
