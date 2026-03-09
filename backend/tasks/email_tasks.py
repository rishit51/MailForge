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
                select(EmailTask).with_for_update(skip_locked=True).where(EmailTask.id == email_task_id)
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
                "[SENDER]  Sent task_id=%s recipient=%s",
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
        if self.request.retries >= self.max_retries:
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
            return  

        raise self.retry(
            exc=exc,
            countdown=60 * (2 ** self.request.retries),
        )
