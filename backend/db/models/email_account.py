import uuid
from datetime import datetime
from sqlalchemy import Enum, JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import EmailProvider


class EmailAccount(Base):
    __tablename__ = "email_accounts"

    id: Mapped[int] = mapped_column(primary_key=True)

    provider: Mapped[EmailProvider] = mapped_column(
        Enum(EmailProvider, name="email_provider_enum"),
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email_address: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        default=lambda: f"dataset-{uuid.uuid4().hex[:8]}",
        nullable=False
    )

    # OAuth tokens for Gmail OR API keys for SendGrid
    config: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

