from sqlalchemy import select
from celery_app import celery_app
from db.db_connection import get_sync_db
from db.models.outbox_event import OutboxEvent


@celery_app.task(name="tasks.process_outbox")
def process_outbox():
    with get_sync_db() as db:
        events = db.execute(
            select(OutboxEvent)
            .where(OutboxEvent.published == False)
            .with_for_update(skip_locked=True)
        ).scalars().all()

        for event in events:
            celery_app.send_task("tasks.run_campaign", args=[event.job_id])
            event.published = True

        db.commit()