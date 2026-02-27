from db.db_models import EmailAccount,EmailTask
from email_providers.factory import provider_factory
import os
from dotenv import load_dotenv


def send_email(account:EmailAccount, task:EmailTask):
    provider = provider_factory(account)
    provider.send(task)
    
# services/oauth_tokens.py
from datetime import datetime, timedelta
from jose import jwt

SECRET = os.getenv("OAUTH_SECRET", "change-me")
ALGO = "HS256"
EXPIRE_MINUTES = 60


def create_client_token(client_id: str, scopes: list[str] | None = None):
    payload = {
        "sub": client_id,
        "scopes": scopes or [],
        "exp": datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES),
        "type": "client"
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)