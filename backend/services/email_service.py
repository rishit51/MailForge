from db.db_models import EmailAccount,EmailTask
from backend.email_providers.factory import provider_factory


def send_email(account:EmailAccount, task:EmailTask):
    provider = provider_factory(account)
    provider.send(task)
    
