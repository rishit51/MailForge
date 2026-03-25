from config import settings

GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET

FRONTEND_URL = settings.FRONTEND_URL



from httpx_oauth.clients.google import GoogleOAuth2

google_oauth_client = GoogleOAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    scopes=[
        "openid", "email", "profile",
        "https://www.googleapis.com/auth/gmail.send",
    ]
)