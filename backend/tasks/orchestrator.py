from datetime import datetime
from db.db_connection import get_sync_db
from celery_app import celery_app
from sqlalchemy import select
from db.models import EmailJob, EmailTask
from db.models.enums import EmailJobStatus, EmailTaskStatus

BATCH_SIZE = 100
from datetime import datetime, timedelta
from db.db_connection import get_sync_db
from celery_app import celery_app
from sqlalchemy import select, func
from db.models import EmailJob, EmailTask
from db.models.enums import EmailJobStatus, EmailTaskStatus


@celery_app.task(name="tasks.run_campaign")
def run_campaign(job_id: int):
    with get_sync_db() as db:

        # grab lock on job
        job = db.execute(
            select(EmailJob)
            .where(
                EmailJob.id == job_id,
                EmailJob.status==EmailJobStatus.RUNNING
            )
            .with_for_update(skip_locked=True)
        ).scalar_one_or_none()

        if job is None:
            return

        # check how many sent in last minute
        sent_in_last_minute = db.execute(
            select(func.count())
            .select_from(EmailTask)
            .where(
                EmailTask.job_id == job_id,
                EmailTask.sent_at >= datetime.utcnow() - timedelta(minutes=1),
            )
        ).scalar()

        remaining = job.throttle_per_minute - sent_in_last_minute

        # throttle limit already hit
        if remaining <= 0:
            job.status = EmailJobStatus.RUNNING
            db.commit()
            celery_app.send_task("tasks.run_campaign", args=[job_id], countdown=10)
            return

        # fetch batch within throttle limit
        tasks = db.execute(
            select(EmailTask)
            .where(
                EmailTask.job_id == job_id,
                EmailTask.status == EmailTaskStatus.PENDING,
            )
            .limit(remaining)
            .with_for_update(skip_locked=True)
        ).scalars().all()

        # no tasks left, mark job completed
        if not tasks:
            stmt = (
                select(
                    func.count().label("total"),
                    func.count().filter(EmailTask.status == EmailTaskStatus.SENT).label("sent"),
                    func.count().filter(EmailTask.status == EmailTaskStatus.FAILED).label("failed"),
                    func.count().filter(
                        EmailTask.status.in_([
                            EmailTaskStatus.PENDING,
                            EmailTaskStatus.IN_PROGRESS,
                        ])
                    ).label("active"),
                )
                .where(EmailTask.job_id == job_id)
            )

            result = db.execute(stmt).one()
            
            total  = result.total
            sent   = result.sent
            failed = result.failed
            active = result.active
            if active > 0:
                return   # still running, do nothing

            if failed > 0 and sent > 0:
                job.status = EmailJobStatus.PARTIAL_SUCCESS

            elif failed > 0 and sent == 0:
                job.status = EmailJobStatus.FAILED

            else:
                job.status = EmailJobStatus.COMPLETED
            job.status = EmailJobStatus.COMPLETED
            db.commit()
            return

        for task in tasks:
            task.status = EmailTaskStatus.IN_PROGRESS

        db.commit()

    # enqueue senders outside transaction
    for task in tasks:
        celery_app.send_task("tasks.send_single_email", args=[task.id])

    # re-enqueue self for next batch
    celery_app.send_task("tasks.run_campaign", args=[job_id], countdown=10)