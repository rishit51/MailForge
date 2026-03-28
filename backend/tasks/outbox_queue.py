from sqlalchemy import select
from celery_app import celery_app
from db.db_connection import get_sync_db
from db.models import OutboxEvent, EmailTaskOutbox


@celery_app.task(name="tasks.process_outbox")
def process_outbox():
    """
    Periodic task that polls the `OutboxEvent` table for new job invocations.
    
    This is the first stage of the outbox pattern. It finds un-published job events, 
    dispatches them to the `run_campaign` task, and marks them as published.
    Uses `FOR UPDATE SKIP LOCKED` for safe parallel processing.
    """
    with get_sync_db() as db:
        events = db.execute(
            select(OutboxEvent)
            .where(OutboxEvent.published == False)
            .with_for_update(skip_locked=True)
        ).scalars().all()

        for event in events:
            celery_app.send_task("tasks.dispatch_campaign", args=[event.job_id])
            event.published = True

        db.commit()

@celery_app.task(name="tasks.process_task_outbox")
def process_task_outbox():
    """
    Processes the `EmailTaskOutbox` to dispatch individual email sends.
    
    This task is responsible for the high-volume throughput needed to send individual
    emails for a campaign. It retrieves a batch of pending tasks using a locking mechanism 
    to ensure idempotency across multiple worker scales.
    
    Args:
        None (Operates on the EmailTaskOutbox database table)
    """
    with get_sync_db() as db:
        # Fetch a batch of unprocessed outbox events
        outbox_events = db.execute(
            select(EmailTaskOutbox)
            .where(EmailTaskOutbox.is_processed == False)
            .limit(100)
            .with_for_update(skip_locked=True)
        ).scalars().all()

        if not outbox_events:
            return

        for event in outbox_events:
            # Safely dispatch to the actual sender task
            celery_app.send_task("tasks.send_single_email", args=[event.task_id])
            event.is_processed = True

        db.commit()
        
        # If we hit the limit, there might be more to process immediately
        if len(outbox_events) == 100:
            celery_app.send_task("tasks.process_task_outbox")