import enum
from datetime import datetime
from sqlalchemy import Enum, DateTime, ForeignKey, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id: Mapped[int] = mapped_column(primary_key=True)

    job_id: Mapped[int] = mapped_column(
        ForeignKey("email_jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # prevents duplicate events for same job
    )

    published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )