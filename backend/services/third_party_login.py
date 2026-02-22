import os
from dotenv import load_dotenv

load_dotenv()


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")



from httpx_oauth.clients.google import GoogleOAuth2

google_oauth_client = GoogleOAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    scopes=[
        "openid", "email", "profile",
        "https://www.googleapis.com/auth/gmail.send",
    ]
)