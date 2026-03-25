from datetime import datetime, timezone
from celery_app import celery_app
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from db.db_connection import get_sync_db
from db.db_models import EmailTask, EmailEvent
from db.models.enums import EmailTaskStatus
import json
import redis
from config import settings
import logging
logger = logging.getLogger(__name__)

redis_client = redis.from_url(settings.CELERY_RESULT_BACKEND)

STATUS_PRIORITY = {
    EmailTaskStatus.PENDING: 1,
    EmailTaskStatus.IN_PROGRESS: 2,
    EmailTaskStatus.DEFERRED: 4,
    EmailTaskStatus.SENT: 3,
    EmailTaskStatus.DELIVERED: 5,
    EmailTaskStatus.OPENED: 6,
    EmailTaskStatus.BOUNCED: 6,
    EmailTaskStatus.FAILED: 6,
}

SENDGRID_TO_STATUS = {
    "processed": EmailTaskStatus.SENT,
    "deferred": EmailTaskStatus.DEFERRED,
    "delivered": EmailTaskStatus.DELIVERED,
    "blocked": EmailTaskStatus.DEFERRED,
    "open": EmailTaskStatus.OPENED,
    "bounce":EmailTaskStatus.BOUNCED,
    "dropped": EmailTaskStatus.FAILED,
}



@celery_app.task(name="tasks.process_sendgrid_events")
def process_sendgrid_events(events):
    with get_sync_db() as db:
        valid_events = []
        for event in events:
            raw_id = event.get("email_task_id")
            if not raw_id:
                continue
            valid_events.append((int(raw_id), event))


        if not valid_events:
            return

        task_ids = [eid for eid, _ in valid_events]
        
        # Fetching existing tasks
        tasks = db.execute(
            select(EmailTask).where(EmailTask.id.in_(task_ids))
        ).scalars()
        tasks_by_id = {t.id: t for t in tasks}
        
        rows = []
        for email_task_id, event in valid_events:
            email_task = tasks_by_id.get(email_task_id)
            if not email_task:
                continue

            provider_event_id = event.get('sg_event_id')
            event_type = event.get("event")
            
            # Safely handle SendGrid's bounce type with a fallback
            if event_type == 'bounce':
                event_type = event.get('type', 'bounce')

            # Ensure timestamp is safely converted to a UTC aware datetime
            event_timestamp = event.get('timestamp', datetime.now(timezone.utc).timestamp())
            created_at_dt = datetime.fromtimestamp(event_timestamp, tz=timezone.utc)

            rows.append({
                "email_task_id": email_task.id,
                "email_job_id": email_task.job_id,
                "event_type": event_type,
                "payload": event,
                "provider_event_id": provider_event_id,
                "created_at": created_at_dt,
            })

            try:
                pub_data = {
                    "email_task_id": email_task.id,
                    "email_job_id": email_task.job_id,
                    "event_type": event_type,
                    "timestamp": created_at_dt.isoformat(),
                    "provider_event_id": provider_event_id
                }
                
                logger.info(json.dumps(pub_data, indent=2))
                
                redis_client.publish(f"job-{email_task.job_id}-analytics", json.dumps(pub_data))
            except Exception:
                pass

            # Handle Status Update
            new_status = SENDGRID_TO_STATUS.get(event_type)
            if new_status and STATUS_PRIORITY[new_status] >= STATUS_PRIORITY.get(email_task.status, 0):
                email_task.status = new_status
                
                # Capture reason for failures
                if event_type in ['bounce', 'deferred', 'dropped', 'blocked']:
                    email_task.error = event.get('reason')


        # Bulk Insert Events using PostgreSQL dialect for conflict resolution
        if rows:
            stmt = pg_insert(EmailEvent).values(rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=['provider_event_id'])
            db.execute(stmt)

        db.commit()