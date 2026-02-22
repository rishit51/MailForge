from sqlalchemy.ext.asyncio import AsyncSession
from db.db_models import User
from operations import get_user_by_email, pwd_context

from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()


async def authenticate_user(
    session: AsyncSession,
    email: str,
    password: str
) -> User | None:
    user = await get_user_by_email(session, email)
    if not user:
        return None
    if not pwd_context.verify(password, user.hashed_password):
        return None
    return user


SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-fallback-change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def decode_access_token(
    token: str,
    session: AsyncSession
) -> Optional[str]:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        email: str | None = payload.get("sub")
        if email is None:
            return None

    except JWTError:
        return None

    return await get_user_by_email(session, email)
