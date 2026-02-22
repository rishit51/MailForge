from pydantic import BaseModel,Field
from datetime import datetime
from db.db_models import SourceType


class DatasetRepr(BaseModel):
    
    id:int
    source_type:SourceType
    columns:list[str] = Field(alias="json_schema")
    created_at:datetime
    name:str
    class Config:
        from_attributes = True
        populate_by_name=True
