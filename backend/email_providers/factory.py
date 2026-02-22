from backend.email_providers.base import BaseEmailProviderAdapter
from backend.email_providers.sendgrid import SendGridAdapter
from backend.db.db_models import EmailAccount, EmailProvider


def provider_factory(account: EmailAccount) -> BaseEmailProviderAdapter:
    if account.provider == EmailProvider.SENDGRID:
        return SendGridAdapter(account)


    raise ValueError("Unsupported provider")
