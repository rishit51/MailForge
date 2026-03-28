from pydantic import BaseModel, EmailStr
from typing import Dict, Optional
from datetime import datetime
from db.models.enums import EmailProvider
from .responses import EmailAccountResponse, EmailAccountListItem

class EmailAccountCreate(BaseModel):
    provider: EmailProvider
    email_address: EmailStr
    config: Dict

class SendgridAccountCreate(BaseModel):
    provider: EmailProvider = EmailProvider.SENDGRID
    email_address: EmailStr
    name: Optional[str] = None
    config: Dict

class SendgridAccountUpdate(BaseModel):
    config: Dict

# Export responses
EmailAccountResponse = EmailAccountResponse
EmailAccountListItem = EmailAccountListItem
