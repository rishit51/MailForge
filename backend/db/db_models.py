# Re-export all .models and enums from the new .models package for backward compatibility

from .models.base import Base
from .models.enums import (
    SourceType,
    EmailProvider,
    EmailJobStatus,
    EmailTaskStatus,
    DatasetStatus
)
from .models.user import User
from .models.dataset import Dataset, DatasetRow
from .models.email_account import EmailAccount
from .models.email_job import EmailJob
from .models.email_task import EmailTask
from .models.email_event import EmailEvent


__all__ = [
    "Base",
    "SourceType",
    "EmailProvider",
    "EmailJobStatus",
    "EmailTaskStatus",
    "User",
    "Dataset",
    "DatasetRow",
    "EmailAccount",
    "EmailJob",
    "EmailTask",
    "EmailEvent",
    "DatasetStatus"
]

