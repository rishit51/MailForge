from pydantic import BaseModel, EmailStr
from typing import Dict
from db.db_models import EmailProvider


class EmailAccountCreate(BaseModel):
    provider: EmailProvider
    email_address: str
    config: Dict


class SendgridAccountCreate(BaseModel):
    provider: EmailProvider
    email_address: str
    name:str|None
    config: Dict
