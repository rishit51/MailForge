
# services/oauth_tokens.py
from datetime import datetime, timedelta
from fastapi import Request
from fastapi.responses import PlainTextResponse
from jose import JWTError, jwt
import os 
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


from jose import jwt, JWTError

def verify_sendgrid_token(token: str):

    payload = jwt.decode(token, SECRET, algorithms=[ALGO])

    if payload.get("type") != "client":
        raise JWTError("invalid token type")

    client_id = payload.get("sub")
    if not client_id:
        raise JWTError("missing subject")

    return client_id