from fastapi import APIRouter,HTTPException,Depends
from fastapi.responses import RedirectResponse
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from db.db_connection import get_db
from db.db_models import EmailAccount,User
from db.models.enums import EmailProvider
from pydantic_models.email_accounts import EmailAccountCreate, SendgridAccountCreate
from sqlalchemy import select
from dependency import get_current_user
from services.third_party_login import google_oauth_client

REDIRECT_URI = 'http://localhost:8000/email-accounts/gmail/callback'
FRONTEND_URL = 'http://localhost:5173'


email_account_router = APIRouter(prefix="/email-accounts", tags=["Email Accounts"])


@email_account_router.post("/")
async def create_email_account(
    payload: EmailAccountCreate,
    db: AsyncSession = Depends(get_db),
    user:User = Depends(get_current_user)
):
    # basic provider-specific sanity checks
    if payload.provider == "sendgrid":
        if "api_key" not in payload.config:
            raise HTTPException(
                status_code=400,
                detail="SendGrid config must include api_key",
            )

    if payload.provider == "gmail":
        if "access_token" not in payload.config:
            raise HTTPException(
                status_code=400,
                detail="Gmail config must include access_token",
            )

    account = EmailAccount(
        provider=payload.provider,
        email_address=payload.email_address,
        config=payload.config,
        user_id=user.id
    )

    db.add(account)
    await db.commit()
    await db.refresh(account)

    return {
        "id": account.id,
        "provider": account.provider,
        "email_address": account.email_address,
    }


@email_account_router.get("/")
async def list_email_accounts(
    db: AsyncSession = Depends(get_db),
    user:User = Depends(get_current_user)
):
    result = await db.execute(select(EmailAccount).where(EmailAccount.user_id==user.id))
    accounts = result.scalars().all()

    return [
        {
            "id": acc.id,
            "provider": acc.provider,
            "email_address": acc.email_address,
            "created_at": acc.created_at,
            "is_active":acc.is_active
        }
        for acc in accounts
    ]
    
@email_account_router.delete("/{account_id}")
async def delete_email_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
):
    account = await db.get(EmailAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")

    await db.delete(account)
    await db.commit()

    return {"status": "deleted"}



@email_account_router.get("/gmail/auth-url")
async def get_gmail_auth_url(
    current_user: User = Depends(get_current_user),
):
    auth_url = await google_oauth_client.get_authorization_url(
        redirect_uri=REDIRECT_URI,
        extras_params={
            "access_type": "offline",
            "prompt": "consent",
        },
        scope=[
        "openid", "email", "profile",
        "https://www.googleapis.com/auth/gmail.send",
    ],
        state=str(current_user.id)
    )
    return {"auth_url": auth_url}




@email_account_router.get("/gmail/callback")
async def gmail_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    token_response = await google_oauth_client.get_access_token(
        code=code,
        redirect_uri=REDIRECT_URI,
    )

    user_id = state


    from jose import jwt

    payload = jwt.get_unverified_claims(token_response["id_token"])

    email_address = payload["email"]
    google_user_id = payload["sub"]
    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id,
            EmailAccount.email_address == email_address,
            EmailAccount.provider == EmailProvider.GMAIL,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.config = {
            "access_token": token_response["access_token"],
            "refresh_token": token_response.get("refresh_token") or existing.config.get("refresh_token"),
            "expires_at": token_response.get("expires_at"),
        }
        existing.is_active = True
    else:
        db.add(EmailAccount(
            provider=EmailProvider.GMAIL,
            user_id=user_id,
            email_address=email_address,
            name=email_address,
            config={
                "access_token": token_response["access_token"],
                "refresh_token": token_response.get("refresh_token"),
                "expires_at": token_response.get("expires_at"),
            },
            is_active=True,
        ))

    await db.commit()
    return RedirectResponse(url=f"{FRONTEND_URL}/accounts/?connected=true")




@email_account_router.post("/sendgrid")
async def verify_and_save_sendgrid(
    payload: SendgridAccountCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    api_key = payload.config.get('api_key')

    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://api.sendgrid.com/v3/user/profile",
            headers=headers
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Invalid SendGrid API key"
        )

    profile = resp.json()

    # Step 2: Save account
    account = EmailAccount(
        provider=EmailProvider.SENDGRID,
        email_address=profile.get("email") or payload.email_address,
        name=payload.name,
        config={"api_key": api_key},
        user_id=user.id,
        is_active=True
    )

    db.add(account)
    await db.commit()
    await db.refresh(account)

    return {
        "id": account.id,
        "provider": account.provider,
        "email_address": account.email_address,
        "verified": True
    }