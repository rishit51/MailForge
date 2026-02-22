import enum

class DatasetStatus(enum.Enum):
    PROCESSING="processing"
    COMPLETED="completed"
    FAILED="failed"


class SourceType(enum.Enum):
    GSHEET = 'gsheet'
    CSV = 'csv'


class EmailProvider(enum.Enum):
    SENDGRID = 'sendgrid'
    GMAIL = 'gmail'


class EmailJobStatus(enum.Enum):
    CREATED = "created"        # job exists, nothing executed yet
    SCHEDULED = "scheduled"    # waiting for scheduled time
    RUNNING = "running"        # tasks are being processed
    COMPLETED = "completed"    # all tasks finished (success or partial failure)
    FAILED = "failed"          # job-level failure (fatal)


class EmailTaskStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = 'in_progress'
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"
    DELIVERED = "delivered"
    OPENED = "opened"
    DEFERRED = 'deferred'

