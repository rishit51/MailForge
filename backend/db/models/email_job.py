from datetime import datetime
from typing import Optional
from sqlalchemy import Enum, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import EmailJobStatus


class EmailJob(Base):
    __tablename__ = "email_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)

    dataset_id: Mapped[int] = mapped_column(
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email_account_id: Mapped[int] = mapped_column(
        ForeignKey("email_accounts.id"),
        nullable=False,
    )

    prompt_template: Mapped[Optional[str]] = mapped_column(nullable=True)
    subject_template: Mapped[Optional[str]] = mapped_column(nullable=True)

    status: Mapped[EmailJobStatus] = mapped_column(
        Enum(EmailJobStatus),
        default=EmailJobStatus.CREATED,
        nullable=False,
    )

    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    throttle_per_minute: Mapped[int] = mapped_column(default=60, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

