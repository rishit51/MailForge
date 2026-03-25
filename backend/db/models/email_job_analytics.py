from sqlalchemy.orm import Mapped,mapped_column
from sqlalchemy import ForeignKey, UniqueConstraint
from .base import Base 

class EmailJobAnalytics(Base):
    __tablename__ = "email_job_analytics"
    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("email_jobs.id", ondelete="CASCADE"))
    sent_count: Mapped[int] = mapped_column(default=0)
    delivered_count: Mapped[int] = mapped_column(default=0)
    opened_count: Mapped[int] = mapped_column(default=0)
    clicked_count: Mapped[int] = mapped_column(default=0)
    bounced_count: Mapped[int] = mapped_column(default=0)
    failed_count: Mapped[int] = mapped_column(default=0)
    
    __table_args__ =(
        UniqueConstraint("job_id", name="uq_job_analytics_row"),
    )
