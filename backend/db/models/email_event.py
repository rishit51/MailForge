from datetime import datetime
from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class EmailEvent(Base):
    __tablename__ = "email_events"

    id: Mapped[int] = mapped_column(primary_key=True)

    email_task_id: Mapped[int] = mapped_column(
        ForeignKey("email_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    email_job_id: Mapped[int] = mapped_column(
        ForeignKey("email_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    event_type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

