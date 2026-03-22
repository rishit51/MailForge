"""
Central export for all Pydantic models.
Import like: from pydantic_models import DatasetRepr, CreateEmailJobRequest
"""

# User models
from .user import (
    UserRead, UserCreate, UserUpdate,
    UserCreateBody, UserResponseBody, 
    UserCreateResponse, UpdateUserProfileBody
)

# Dataset models  
from .dataset import (
    DatasetRepr, DatasetListResponse,
    DatasetListItem, DatasetPreviewResponse
)

# Email job models
from .email_jobs import (
    CreateEmailJobRequest, EmailJobResponse,
    EmailJobListItem, EmailJobCreateResponse
)

# Email account models
from .email_accounts import (
    EmailAccountCreate, SendgridAccountCreate,
    EmailAccountResponse, EmailAccountListItem
)

# LLM models already self-contained in routes/llm.py - no import needed


# Base responses
from .responses import (
    PaginatedResponse, DatasetListResponse,
    EmailJobResponse, EmailAccountResponse
)

__all__ = [
    # User
    "UserRead", "UserCreate", "UserUpdate",
    "UserCreateBody", "UserResponseBody", 
    "UserCreateResponse", "UpdateUserProfileBody",
    
    # Dataset
    "DatasetRepr", "DatasetListResponse", "DatasetPreviewResponse",
    
    # Email Jobs
    "CreateEmailJobRequest", "EmailJobResponse", "EmailJobCreateResponse",
    
    # Email Accounts
    "EmailAccountCreate", "SendgridAccountCreate",
    "EmailAccountResponse", "EmailAccountListItem",
    
    # LLM
    "GenerateTemplateRequest", "GenerateTemplateResponse"
]

