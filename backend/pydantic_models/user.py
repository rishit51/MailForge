from typing import Optional
from pydantic import BaseModel
import uuid

from fastapi_users import schemas


class UserRead(schemas.BaseUser[uuid.UUID]):
    pass


class UserCreate(schemas.BaseUserCreate):
    pass


class UserUpdate(schemas.BaseUserUpdate):
    pass

class UserCreateBody(BaseModel):
    email:str
    password:str
    name:str
    
class UserResponseBody(BaseModel):
    email:str
    name:str | None
    id:int
    model_config = {"from_attributes": True}

    
class UserCreateResponse(BaseModel):
    message: str
    user: UserResponseBody
    
class UpdateUserProfileBody(BaseModel):
    name: Optional[str] = None