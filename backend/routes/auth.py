import os
from db.db_models import User
from dependency import get_current_user
from services.third_party_login import *
from fastapi import APIRouter, Depends
auth_service_router = APIRouter()


@auth_service_router.get("/me")
async def get_me(user:User=Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
    }
