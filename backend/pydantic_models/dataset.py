from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Any
from db.db_models import SourceType
from .responses import DatasetListItem, DatasetPreviewResponse, DatasetListResponse

class DatasetRepr(BaseModel):
    id: int
    source_type: SourceType
    columns: List[str] = Field(alias="json_schema")
    created_at: datetime
    name: str
    
    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }

# Export for convenience
DatasetPreviewResponse = DatasetPreviewResponse
DatasetListResponse = DatasetListResponse
DatasetListItem = DatasetListItem
