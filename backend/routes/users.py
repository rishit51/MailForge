from services.auth_service import fastapi_users,auth_backend
from services.third_party_login import google_oauth_client
from pydantic_models.user import UserCreate,UserRead

log_router = fastapi_users.get_auth_router(auth_backend)
register_router = fastapi_users.get_register_router(UserRead,UserCreate)
