from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class EmailTaskOutbox(Base):
    __tablename__ = "email_task_outbox"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    task_id: Mapped[int] = mapped_column(
        ForeignKey("email_tasks.id", ondelete="CASCADE"),
        nullable=False,
    )

    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
