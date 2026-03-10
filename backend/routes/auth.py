import os

from fastapi.responses import JSONResponse
from db.db_models import User,EmailAccount
from dependency import get_current_user
from services.third_party_login import *
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import Form,HTTPException
from db.db_connection import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import status
from utilities.generate_token import create_client_token

auth_service_router = APIRouter()


@auth_service_router.get("/me")
async def get_me(user:User=Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
    }



from sqlalchemy import select
import hmac
import logging
# Set up your logger
logger = logging.getLogger(__name__)

@auth_service_router.post("/oauth/token")
async def issue_client_token(
    grant_type: str = Form(...),
    client_id: str = Form(...),
    client_secret: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    logger.info(f"OAuth token request received for client_id: {client_id}")

    # 1️⃣ VALIDATE GRANT TYPE
    if grant_type != "client_credentials":
        logger.warning(f"Invalid grant type '{grant_type}' requested by client_id: {client_id}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "unsupported_grant_type"}
        )

    try:
        # 2️⃣ FETCH CLIENT ACCOUNT
        result = await db.execute(
            select(EmailAccount).where(EmailAccount.oauth_id == client_id)
        )
        account = result.scalar_one_or_none()

        if not account:
            logger.warning(f"Token failed: No EmailAccount found for client_id: {client_id}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "invalid_client"}
            )
        
        logger.debug(f"Account found for client_id: {client_id}. Verifying secret...")

        # 3️⃣ VALIDATE SECRET
        # Safely get the config dict. (If config is a JSON string, you'll need json.loads(account.config) here)
        config = account.config or {}
        stored_secret = config.get("oauth_client_secret")
        
        if not stored_secret:
            logger.error(f"Configuration error: Account for client_id {client_id} is missing 'oauth_client_secret' in its config.")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "invalid_client"}
            )

        if not hmac.compare_digest(stored_secret, client_secret):
            logger.warning(f"Token failed: Secret mismatch for client_id: {client_id}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "invalid_client"}
            )

        # 4️⃣ ISSUE TOKEN
        token = create_client_token(client_id=client_id)
        logger.info(f"Successfully issued OAuth token for client_id: {client_id}")

        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 3600
        }

    except Exception as e:
        # Catch unexpected errors (like DB failures, type errors in HMAC, etc.)
        logger.exception(f"Unexpected error during token issuance for client_id {client_id}: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "server_error"}
        )