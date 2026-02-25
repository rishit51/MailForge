from pydantic import BaseModel
from db.db_models import EmailJobStatus
from datetime import datetime
from typing import Optional

class CreateEmailJobRequest(BaseModel):
    dataset_id: int
    email_account_id: int
    prompt_template: str
    subject_template: str
    scheduled_at: Optional[datetime] = None
    throttle_per_minute: Optional[int] = 60
