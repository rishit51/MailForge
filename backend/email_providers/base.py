from abc import ABC, abstractmethod
from db.db_models import EmailAccount,EmailTask


class BaseEmailProviderAdapter(ABC):
    def __init__(self, account: EmailAccount):
        self.account = account
        self.secrets = account.config

    @abstractmethod
    def send(self, task: EmailTask):
        ...
