from db.models import EmailAccount, EmailTask
from email_providers.factory import provider_factory
import os
from dotenv import load_dotenv


def send_email(account:EmailAccount, task:EmailTask):
    provider = provider_factory(account)
    provider.send(task)
    