# tasks/dispatcher.py

import logging
from datetime import datetime, timedelta
from celery_app import celery_app
from sqlalchemy import or_, select, func
from db.db_connection import get_sync_db
from db.db_models import (
    EmailJob,
    EmailTask,
    EmailTaskStatus,
    EmailJobStatus,
    EmailEvent,
    EmailAccount
)

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.dispatch_emails")
def dispatch_emails():
    now = datetime.utcnow()
    logger.info("[DISPATCHER] Tick at %s", now.isoformat())

    with get_sync_db() as db:
        jobs = db.execute(
            select(EmailJob).where(
                EmailJob.status.in_(
                    [EmailJobStatus.SCHEDULED, EmailJobStatus.RUNNING]
                ),
                or_(
                    EmailJob.scheduled_at.is_(None),
                    EmailJob.scheduled_at <= now,
                )                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        ,
            )
        ).scalars().all()

        if not jobs:
            logger.debug("[DISPATCHER] No eligible jobs found")
            return

        logger.info("[DISPATCHER] Found %d eligible jobs", len(jobs))

        for job in jobs:
            logger.info(
                "[DISPATCHER] Processing job_id=%s status=%s",
                job.id,
                job.status.value,
            )

            if job.status != EmailJobStatus.RUNNING:
                job.status = EmailJobStatus.RUNNING
                db.commit()
                logger.info(
                    "[DISPATCHER] Job %s status -> RUNNING",
                    job.id,
                )

            throttle = job.throttle_per_minute or 60
            window_start = now - timedelta(seconds=60)

            sent_count = db.execute(
                select(func.count())
                .select_from(EmailEvent)
                .where(
                    EmailEvent.email_job_id == job.id,
                    EmailEvent.event_type == "sent",
                    EmailEvent.created_at >= window_start,
                )
            ).scalar()

            remaining_budget = throttle - sent_count

            logger.info(
                "[DISPATCHER] Job %s throttle=%d sent_last_min=%d remaining=%d",
                job.id,
                throttle,
                sent_count,
                remaining_budget,
            )

            if remaining_budget <= 0:
                logger.info(
                    "[DISPATCHER] Job %s throttled, skipping",
                    job.id,
                )
                continue

            tasks = db.execute(
                select(EmailTask)
                .where(
                    EmailTask.job_id == job.id,
                    EmailTask.status == EmailTaskStatus.PENDING,
                )
                .order_by(EmailTask.id)
                .limit(remaining_budget)
                .with_for_update(skip_locked=True)
            ).scalars().all()

            if not tasks:
                logger.info(
                    "[DISPATCHER] Job %s has no pending tasks",
                    job.id,
                )
                continue

            logger.info(
                "[DISPATCHER] Dispatching %d tasks for job %s",
                len(tasks),
                job.id,
            )

            for task in tasks:
                task.status = EmailTaskStatus.IN_PROGRESS
                celery_app.send_task(
                    "tasks.send_single_email",
                    args=[task.id],
                    queue="emails",
                )
                logger.debug(
                    "[DISPATCHER] Enqueued task_id=%s job_id=%s",
                    task.id,
                    job.id,
                )

            db.commit()

        logger.info("[DISPATCHER] Cycle complete")
# tasks/sender.py

import logging
from datetime import datetime
from celery_app import celery_app
from sqlalchemy import select
from db.db_connection import get_sync_db
from db.db_models import (
    EmailTask,
    EmailTaskStatus,
    EmailJob,
    EmailEvent,
)
from services.email_service import send_email

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, name="tasks.send_single_email")
def send_single_email(self, email_task_id: int):
    logger.info("[SENDER] Start task_id=%s", email_task_id)

    try:
        with get_sync_db() as db:
            task = db.execute(
                select(EmailTask).where(EmailTask.id == email_task_id)
            ).scalar_one_or_none()

            if not task:
                logger.warning(
                    "[SENDER] Task %s not found, skipping",
                    email_task_id,
                )
                return

            if task.status == EmailTaskStatus.SENT:
                logger.info(
                    "[SENDER] Task %s already SENT, idempotent skip",
                    email_task_id,
                )
                return

            job = db.execute(
                select(EmailJob).where(EmailJob.id == task.job_id)
            ).scalar_one()
            account = db.execute(select(EmailAccount).where(EmailAccount.id==job.email_account_id)).scalar_one()
            logger.info(
                "[SENDER] Sending email task_id=%s job_id=%s recipient=%s",
                task.id,
                job.id,
                task.recipient_email,
            )

            send_email(account, task)

            task.status = EmailTaskStatus.SENT
            task.sent_at = datetime.utcnow()

            event = EmailEvent(
                email_task_id=task.id,
                email_job_id=job.id,
                event_type="sent",
                payload={
                    "recipient": task.recipient_email,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            db.add(event)
            db.commit()

            logger.info(
                "[SENDER] ✓ Sent task_id=%s recipient=%s",
                task.id,
                task.recipient_email,
            )

    except Exception as exc:
        logger.exception(
            "[SENDER] Error sending task_id=%s retry=%d/%d",
            email_task_id,
            self.request.retries + 1,
            self.max_retries,
        )

        with get_sync_db() as db:
            task = db.execute(
                select(EmailTask).where(EmailTask.id == email_task_id)
            ).scalar_one_or_none()

            if task:
                task.status = EmailTaskStatus.FAILED
                task.error = str(exc)
                db.commit()
                logger.error(
                    "[SENDER] Marked task_id=%s as FAILED",
                    email_task_id,
                )

        raise self.retry(
            exc=exc,
            countdown=60 * (2 ** self.request.retries),
        )
