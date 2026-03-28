import logging
from datetime import datetime
from celery_app import celery_app
from sqlalchemy import select
from db.db_connection import get_sync_db
from db.models import (
    EmailTask,
    EmailJob,
    EmailAccount,
    EmailTaskStatus,
    EmailEvent,
    EmailProvider
)
from services.email_service import send_email
from utilities.token_bucket import consume_token

logger = logging.getLogger(__name__)


def get_rate_config(provider, throttle_per_minute):
    if provider == EmailProvider.GMAIL:
        refill_rate = 2.5  # per second (~150/min)
        max_tokens = 150
    elif provider == EmailProvider.SENDGRID:
        refill_rate = 166.66667  # per second (~10k/min)
        max_tokens = 10000
    else:
        raise ValueError(f"Unsupported provider: {provider}")

    # normalize with job-level throttle
    refill_rate = min(refill_rate, throttle_per_minute / 60)
    max_tokens = min(max_tokens, throttle_per_minute)

    return refill_rate, max_tokens


@celery_app.task(bind=True, max_retries=3, name="tasks.send_single_email")
def send_single_email(self, email_task_id: int):
    """
    Task to send a single email. 
    1: Checks for idempotency and returns if email was already SENT or locked by another worker
    2: Tries to consume a token and if not available then returns
    3: If succesful in consuming tokens then immediately locks the task and then starts the process to send it
    """
    logger.info("[SENDER] Start task_id=%s", email_task_id)

    try:
        # -------------------------------
        # PHASE 1: LIGHTWEIGHT FETCH (NO LOCK)
        # -------------------------------
        with get_sync_db() as db:
            result = db.execute(
                select(
                    EmailTask.id,
                    EmailTask.status,
                    EmailJob.id,
                    EmailJob.throttle_per_minute,
                    EmailAccount.provider
                )
                .join(EmailJob, EmailTask.job_id == EmailJob.id)
                .join(EmailAccount, EmailJob.email_account_id == EmailAccount.id)
                .where(EmailTask.id == email_task_id)
            ).first()

        if not result:
            logger.warning("[SENDER] Task %s not found", email_task_id)
            return

        task_id, task_status, job_id, throttle, provider = result

        if task_status == EmailTaskStatus.SENT:
            logger.info("[SENDER] Task %s already SENT, skipping", email_task_id)
            return

        # -------------------------------
        # PHASE 2: RATE LIMIT CHECK (NO LOCK)
        # -------------------------------
        refill_rate, max_tokens = get_rate_config(provider, throttle)
        
        if not consume_token(f'Job_throttle-{job_id}',refill_rate,max_tokens):
            celery_app.send_task(
                "tasks.send_single_email",
                args=[email_task_id],
                countdown=1
            )
            return

        # -------------------------------
        # PHASE 3: LOCK + PROCESS
        # -------------------------------
        with get_sync_db() as db:
            result = db.execute(
                select(EmailTask, EmailJob, EmailAccount)
                .join(EmailJob, EmailTask.job_id == EmailJob.id)
                .join(EmailAccount, EmailJob.email_account_id == EmailAccount.id)
                .with_for_update(of=EmailTask, skip_locked=True)
                .where(EmailTask.id == email_task_id)
            ).first()

            if not result:
                logger.info("[SENDER] Task %s locked by another worker", email_task_id)
                return

            task, job, account = result

            if task.status == EmailTaskStatus.SENT:
                logger.info("[SENDER] Task %s already SENT (post-lock)", task.id)
                return

            logger.info(
                "[SENDER] Sending email task_id=%s job_id=%s recipient=%s",
                task.id,
                job.id,
                task.recipient_email,
            )

            # -------------------------------
            # PHASE 4: SEND EMAIL (STILL INSIDE TX — acceptable for now)
            # -------------------------------
            send_email(account, task)

            # -------------------------------
            # PHASE 5: MARK SENT + EVENT
            # -------------------------------
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

        # -------------------------------
        # PHASE 6: ASYNC ANALYTICS (OUTSIDE TX)
        # -------------------------------
        try:
            if account.provider == EmailProvider.GMAIL:
                from utilities.pubsub import publish_job_event
                publish_job_event(
                    job_id=job.id,
                    task_id=task.id,
                    event_type="Sent",
                    payload_data={
                        "recipient": task.recipient_email,
                        "timestamp": event.payload["timestamp"],
                    }
                )
        except Exception as e:
            logger.error(
                "[SENDER] Analytics publish failed job=%s error=%s",
                job.id,
                e
            )

        logger.info(
            "[SENDER] Sent task_id=%s recipient=%s",
            task.id,
            task.recipient_email,
        )

    except Exception as exc:
        logger.exception(
            "[SENDER] Error task_id=%s retry=%d/%d",
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
                        "[SENDER] Marked FAILED task_id=%s",
                        email_task_id,
                    )
            return

        raise self.retry(
            exc=exc,
            countdown=60 * (2 ** self.request.retries),
        )