from fastapi import APIRouter,HTTPException,Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.db_connection import get_db
from db.db_models import EmailAccount,User
from pydantic_models.email_accounts import EmailAccountCreate
from sqlalchemy import select
from dependency import get_current_user
from services.third_party_login import google_oauth_client
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



