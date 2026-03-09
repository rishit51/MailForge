from fastapi import APIRouter, Request, Depends,HTTPException
from fastapi.responses import PlainTextResponse
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert, select
from datetime import datetime

from db.db_connection import get_db
from db.db_models import EmailTask, EmailEvent
from utilities.generate_token import verify_sendgrid_token

webhook_integration_router = APIRouter(prefix="/webhook")


# status precedence (prevents regression)
STATUS_PRIORITY = {
    "PENDING": 1,
    "IN_PROGRESS": 2,
    "DELIVERED": 3,
    "FAILED": 3,
}

EVENT_TO_STATUS = {
    "processed": "IN_PROGRESS",
    "delivered": "DELIVERED",
    "bounce": "FAILED",
    "dropped": "FAILED",
}


@webhook_integration_router.post("/sendgrid")
async def sendgrid_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):

    # -----------------------------
    # 1️⃣ VERIFY OAUTH TOKEN FIRST
    # -----------------------------
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        return PlainTextResponse("unauthorized", status_code=401)

    token = auth_header.split(" ", 1)[1]

    try:
        client_id = verify_sendgrid_token(token)
        
    except:
        raise HTTPException(401)
    try:
        events = await request.json()
    except Exception:
        return PlainTextResponse("invalid_request", status_code=400)

    if not isinstance(events, list):
        return PlainTextResponse("invalid_request", status_code=400)

        # -----------------------------
    # 3️⃣ PROCESS EVENTS (BATCHED)
    # -----------------------------

    # Parse and validate email_task_ids upfront, preserving event mapping
    valid_events: list[tuple[int, dict]] = []
    for event in events:
        raw_id = event.get("email_task_id")
        if not raw_id:
            continue
        try:
            valid_events.append((int(raw_id), event))
        except ValueError:
            continue

    if not valid_events:
        return {"status": "ok"}

    # Single query to fetch all needed EmailTasks at once (eliminates N+1)
    task_ids = [eid for eid, _ in valid_events]
    result = await db.execute(
        select(EmailTask).where(EmailTask.id.in_(task_ids))
    )
    
    # -----------------------------
    # 4️⃣ BUILD ROWS & MUTATE IN MEMORY
    # -----------------------------
    now = datetime.utcnow()
    event_rows = []

    for email_task_id, event in valid_events:
        email_task = tasks_by_id.get(email_task_id)
        if not email_task:
            continue

        event_type = event.get("event", "unknown")

        event_rows.append({
            "email_task_id": email_task.id,
            "email_job_id": email_task.job_id,
            "event_type": event_type,
            "payload": event,
            "created_at": now,  # shared timestamp avoids repeated utcnow() calls
        })

        # Update status only if new status has higher priority
        new_status = EVENT_TO_STATUS.get(event_type)
        if new_status and STATUS_PRIORITY[new_status] >= STATUS_PRIORITY[email_task.status]:
            email_task.status = new_status

        # Store provider message id if not already set
        sg_message_id = event.get("sg_message_id")
        if sg_message_id and not email_task.provider_message_id:
            email_task.provider_message_id = sg_message_id

    # -----------------------------
    # 5️⃣ BULK INSERT EVENTS
    # -----------------------------
    if event_rows:
        await db.execute(insert(EmailEvent), event_rows)

    await db.commit()

    return {"status": "ok"}