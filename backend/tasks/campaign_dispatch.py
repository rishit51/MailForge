from datetime import datetime
from db.db_connection import get_sync_db
from celery_app import celery_app
from sqlalchemy import or_, select
from db.models import EmailJob,EmailJobStatus,Dataset
from db.models.enums import DatasetStatus
from db.models import OutboxEvent


@celery_app.task(name="tasks.schedule_campaigns")
def schedule_campaigns():
    now = datetime.utcnow()

    with get_sync_db() as db:
        # fetch eligible jobs
        jobs = db.execute(
            select(EmailJob)
            .join(Dataset, EmailJob.dataset_id == Dataset.id)
            .where(
                EmailJob.status == EmailJobStatus.SCHEDULED,
                or_(
                    EmailJob.scheduled_at.is_(None),
                    EmailJob.scheduled_at <= now,
                ),
                Dataset.dataset_status == DatasetStatus.COMPLETED,
            ).with_for_update(skip_locked=True)
        ).scalars().all()

        for job in jobs:
            job.status = EmailJobStatus.RUNNING
            db.add(OutboxEvent(job_id=job.id))
        
        db.commit()