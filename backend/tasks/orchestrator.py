import logging
from db.db_connection import get_sync_db
from celery_app import celery_app
from sqlalchemy import select, func
from db.models import EmailJob, EmailTask, EmailTaskOutbox
from db.models.enums import EmailJobStatus, EmailTaskStatus

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.dispatch_campaign")
def dispatch_campaign(job_id: int):
    """
    Dispatches a list of email tasks for a given job into the outbox.
    
    This task transitions a job to the `RUNNING` state and fetches `PENDING` email 
    tasks in batches. For each task, it creates an entry in the `EmailTaskOutbox` 
    to be picked up by the outbox processor.
    
    Args:
        job_id (int): The ID of the EmailJob to dispatch.
    """
    with get_sync_db() as db:
        job = db.execute(
            select(EmailJob)
            .where(EmailJob.id == job_id)
            .with_for_update(skip_locked=True)
        ).scalar_one_or_none()
        if job is None:
            logger.info(f"Job {job_id} not found or already locked.")
            return

        if job.status != EmailJobStatus.SCHEDULED:
            return

        # 2. Mark Job as RUNNING immediately
        job.status = EmailJobStatus.RUNNING
        db.commit()

        # 3. Setup the query to fetch tasks efficiently without blowing up RAM
        fetch_limit = 2000
        task_query = (
            select(EmailTask)
            .where(
                EmailTask.job_id == job_id,
                EmailTask.status == EmailTaskStatus.PENDING
            )
            .limit(fetch_limit)
        )

        # 4. Stream from PostgreSQL and push to Celery
        tasks = db.scalars(task_query).all()

        # Bulk update this chunk to IN_PROGRESS so we don't double-queue them
        # if the dispatcher somehow crashes mid-run
        for task in tasks:
            task.status = EmailTaskStatus.IN_PROGRESS
            db.add(EmailTaskOutbox(task_id=task.id))

        db.commit()

    # Trigger outbox processor immediately to reduce latency
    celery_app.send_task("tasks.process_task_outbox")

    # If we fetched exactly the limit, there might be more tasks pending right now.
    if len(tasks) == fetch_limit:
        celery_app.send_task("tasks.dispatch_campaign", args=[job_id], countdown=1)
    else:
        logger.info(f"Successfully dispatched all tasks for Job {job_id}.")
