from services.auth_service import fastapi_users

get_current_user = fastapi_users.current_user(active=True)
