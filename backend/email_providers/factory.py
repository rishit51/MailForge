from email_providers.base import BaseEmailProviderAdapter
from email_providers.gmail import GmailAdapter
from email_providers.sendgrid import SendGridAdapter
from db.db_models import EmailAccount, EmailProvider
from db.db_connection import get_sync_db

def provider_factory(account: EmailAccount) -> BaseEmailProviderAdapter:
    if account.provider == EmailProvider.SENDGRID:
        return SendGridAdapter(account)
    
    if account.provider == EmailProvider.GMAIL:
        return GmailAdapter(account)


    raise ValueError("Unsupported provider")
