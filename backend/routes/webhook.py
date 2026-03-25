import logging
from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse, JSONResponse
from jose import JWTError
import json

from utilities.generate_token import verify_sendgrid_token
from tasks.email_events import process_sendgrid_events

# Set up a logger for your webhook
logger = logging.getLogger(__name__)

webhook_integration_router = APIRouter(prefix="/webhook")

@webhook_integration_router.post("/sendgrid", summary="SendGrid delivery events webhook", description="Validates OAuth Bearer token (from /auth/sendgrid/.../generate), queues Celery process_sendgrid_events. Why OAuth? Links events to EmailAccount fast. Returns 202 immediately.")
async def sendgrid_webhook(request: Request):
    # -----------------------------
    # 1️⃣ VERIFY OAUTH TOKEN FIRST
    # -----------------------------
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        # Log this as a critical warning so you don't fail silently!
        logger.warning("SendGrid Webhook received without valid Bearer token. Dropping request.")
        return PlainTextResponse("Processed", status_code=202)

    token = auth_header.split(" ", 1)[1]

    try:
        client_id = verify_sendgrid_token(token)
    except JWTError:
        logger.warning("SendGrid Webhook received with invalid JWT token. Dropping request.")
        # Returning 202 to avoid SendGrid retries, but we logged it so we know it happened
        return PlainTextResponse("Invalid Token", status_code=401)

    # -----------------------------
    # 2️⃣ PARSE AND VALIDATE PAYLOAD
    # -----------------------------
    try:
        events = await request.json()
    except json.JSONDecodeError:
        logger.error("SendGrid Webhook received invalid JSON.")
        return PlainTextResponse("invalid_json", status_code=400)
    except Exception as e:
        logger.error(f"Unexpected error parsing SendGrid payload: {e}")
        return PlainTextResponse("invalid_request", status_code=400)

    if not isinstance(events, list):
        return PlainTextResponse("invalid_format_expected_list", status_code=400)

    # -----------------------------
    # 3️⃣ DELEGATE TO CELERY & RESPOND
    # -----------------------------

    process_sendgrid_events.delay(events)

    return JSONResponse(content={"status": "accepted"}, status_code=202)