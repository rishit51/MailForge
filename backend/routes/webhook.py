from fastapi import APIRouter, Request, Header, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db.db_connection import get_db
from db.db_models import EmailTask, EmailEvent, EmailTaskStatus


EVENT_TO_STATUS = {
    "processed": EmailTaskStatus.SENT,
    "delivered": EmailTaskStatus.DELIVERED,
    "open": EmailTaskStatus.OPENED,
    "bounce": EmailTaskStatus.BOUNCED,
    "dropped": EmailTaskStatus.FAILED,
}



webhook_integration_router = APIRouter(prefix="/webhook")

@webhook_integration_router.post("/sendgrid")
async def sendgrid_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
  
    # 2️⃣ Parse payload (SendGrid sends a list of events)
    try:
        events = await request.json()
    except Exception:
        return PlainTextResponse("invalid_request", status_code=400)

    if not isinstance(events, list):
        return PlainTextResponse("invalid_request", status_code=400)
    
    # 3️⃣ Process each event
    for event in events:
        custom_args = event.get("custom_args")
        if not custom_args:
            continue

        email_task_id = custom_args.get("email_task_id")
        if not email_task_id:
            continue

        try:
            email_task_id = int(email_task_id)
        except ValueError:
            continue

        email_task = await db.get(EmailTask, email_task_id)
        if not email_task:
            continue

        db.add(
            EmailEvent(
                email_task_id=email_task.id,
                email_job_id=email_task.job_id,
                event_type=event.get("event", "unknown"),
                payload=event,
            )
        )

        # 5️⃣ Update task status
        new_status = EVENT_TO_STATUS.get(event.get("event"))
        if new_status:
            email_task.status = new_status

        # 6️⃣ Store provider message id (optional)
        sg_message_id = event.get("sg_message_id")
        if sg_message_id and not email_task.provider_message_id:
            email_task.provider_message_id = sg_message_id

    # 7️⃣ Commit once
    await db.commit()

    return {"status": "ok"}

