import os
from db.db_models import User,EmailAccount
from dependency import get_current_user
from services.email_service import create_client_token
from services.third_party_login import *
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import Form,HTTPException
from db.db_connection import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import status

auth_service_router = APIRouter()


@auth_service_router.get("/me")
async def get_me(user:User=Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
    }



from sqlalchemy import select
import hmac

@auth_service_router.post("/oauth/token")
async def issue_client_token(
    grant_type: str = Form(...),
    client_id: str = Form(...),
    client_secret: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    if grant_type != "client_credentials":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="unsupported_grant_type"
        )

    result = await db.execute(
        select(EmailAccount).where(EmailAccount.oauth_id == client_id)
    )
    account = result.scalar_one_or_none()

    # Spec says invalid client should NOT reveal existence
    if not account:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_client"
        )

    stored_secret = account.config.get("CLIENT_SECRET")

    # constant-time comparison to avoid timing leaks
    if not stored_secret or not hmac.compare_digest(stored_secret, client_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_client"
        )


    token = create_client_token(
        client_id=client_id,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 3600
    }