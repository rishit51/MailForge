from datetime import datetime
from sqlalchemy import Enum, JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import SourceType,DatasetStatus


class Dataset(Base):
    __tablename__ = "datasets"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="source_type_enum"),
        nullable=False,
    )
    dataset_status:Mapped[DatasetStatus]=mapped_column(
        Enum(DatasetStatus, name="status"),
        nullable=False,
        default=DatasetStatus.PROCESSING
    )
    name: Mapped[str] = mapped_column(nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    json_schema: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    email_column: Mapped[str] = mapped_column(nullable=False)
    processed_rows:Mapped[int] = mapped_column(default=0)


class DatasetRow(Base):
    __tablename__ = "dataset_rows"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    dataset_id: Mapped[int] = mapped_column(
        ForeignKey("datasets.id", ondelete="CASCADE"), index=True
    )
    row_data: Mapped[dict] = mapped_column(JSON, nullable=False)

