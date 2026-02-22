from datetime import datetime
from typing import Optional
from sqlalchemy import Enum, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import EmailTaskStatus


class EmailTask(Base):
    __tablename__ = "email_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)

    job_id: Mapped[int] = mapped_column(
        ForeignKey("email_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    dataset_row_id: Mapped[int] = mapped_column(
        ForeignKey("dataset_rows.id", ondelete="CASCADE"),
        nullable=False,
    )

    recipient_email: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    rendered_subject: Mapped[Optional[str]] = mapped_column()
    rendered_body: Mapped[Optional[str]] = mapped_column()

    status: Mapped[EmailTaskStatus] = mapped_column(
        Enum(EmailTaskStatus),
        default=EmailTaskStatus.PENDING,
        nullable=False,
    )

    error: Mapped[Optional[str]] = mapped_column(String)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    __table_args__ = (
        UniqueConstraint("job_id", "dataset_row_id", name="uq_job_row"),
    )

