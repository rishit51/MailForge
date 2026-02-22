from pydantic import BaseModel
from typing import Dict
from db.db_models import EmailProvider


class EmailAccountCreate(BaseModel):
    provider: EmailProvider
    email_address: str
    config: Dict
