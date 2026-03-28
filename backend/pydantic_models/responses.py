from pydantic import BaseModel
from typing import Generic, TypeVar, List, Optional, Any
from datetime import datetime
from fastapi_pagination import Params as PaginationParams

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    pagination: dict

class DatasetListItem(BaseModel):
    id: int
    name: str
    type: str
    rows: int
    status: str
    date: str
    
    model_config = {"from_attributes": True}

class DatasetListResponse(PaginatedResponse[DatasetListItem]):
    pass

class DatasetPreviewResponse(BaseModel):
    json_schema: List[str]
    rows: List[List[Any]]

class EmailJobListItem(BaseModel):
    id: int
    dataset_id: int
    email_account_id: int
    status: str
    task_count: Optional[int] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}

class EmailJobResponse(BaseModel):
    id: int
    dataset_id: int
    email_account_id: int
    status: str
    task_count: int
    created_at: datetime
    subject_template: str
    prompt_template: str
    throttle_per_minute: Optional[int] = 60
    scheduled_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}

class EmailJobCreateResponse(BaseModel):
    job_id: int
    status: str
    message: str
    dataset_id: int
    email_account_id: int

class EmailAccountListItem(BaseModel):
    id: int
    provider: str
    email_address: str
    verified: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}

class EmailAccountResponse(BaseModel):
    id: int
    provider: str
    email_address: str
    config: dict
    verified: bool = False
    created_at: datetime
    
    model_config = {"from_attributes": True}

class AuthLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserProfileResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None


class EmailJobAnalyticsResponse(BaseModel):

    id: int
    job_id: int
    sent_count: int
    delivered_count: int
    opened_count: int
    clicked_count: int
    bounced_count: int
    failed_count: int
    
    model_config = {"from_attributes": True}
