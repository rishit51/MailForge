import logging
from db.models.enums import DatasetStatus
from utilities.render_templates import render_template
from db.db_connection import SyncSessionLocal
from db.models import Dataset, DatasetRow, EmailJob, EmailTask
from db.models.enums import EmailJobStatus, EmailTaskStatus
from sqlalchemy import select
from celery_app import celery_app
from sqlalchemy.dialects.postgresql import insert as pg_insert 

logger = logging.getLogger(__name__)

@celery_app.task(
    bind=True, 
    name="tasks.process_email_tasks",
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=3,
    acks_late=True
)
def process_email_campaign(self, email_job_id: int):
    """
    Generates individual EmailTask records from a dataset for a specific job.
    
    This task iterates over the associated dataset, renders the subject and body 
    templates for each row, and bulk-inserts them as `PENDING` email tasks. 
    Once complete, it transitions the job status to `SCHEDULED`.
    """
    batch_size = 1000
    rows_buffer = []

    logger.info(f"Starting to process campaign for job_id={email_job_id}")

    try:
        with SyncSessionLocal() as db:
            # 1. Acquire pessimistic lock on the EmailJob
            result = db.execute(
                select(EmailJob)
                .with_for_update(skip_locked=True)
                .where(EmailJob.id == email_job_id)
            )
            email_job = result.scalar_one_or_none()

            if email_job is None:
                logger.warning(f"Job {email_job_id} not found or already being processed by another worker.")
                return
            
            if email_job.status != EmailJobStatus.PROCESSING:
                logger.info(f"Skipping job {email_job_id} because status is {email_job.status}")
                return
            
            # 2. Fetch Dataset and check lifecycle
            result = db.execute(
                select(Dataset).where(Dataset.id == email_job.dataset_id)
            )
            dataset = result.scalar_one_or_none()
            
            if dataset is None:
                logger.error(f"Terminating job {email_job_id}: Dataset {email_job.dataset_id} not found.")
                email_job.status = EmailJobStatus.FAILED
                db.commit()
                return

            if dataset.dataset_status == DatasetStatus.FAILED:
                logger.error(f"Failing job {email_job_id}: Source dataset {dataset.id} is in FAILED state.")
                email_job.status = EmailJobStatus.FAILED
                db.commit()
                return
            
            if dataset.dataset_status != DatasetStatus.COMPLETED:
                logger.info(f"Dataset {dataset.id} still in progress ({dataset.dataset_status}). Retrying in 10s...")
                raise self.retry(countdown=10)
            
            # 3. Stream Rows and generate tasks
            result = db.execute(
                select(DatasetRow)
                .where(DatasetRow.dataset_id == dataset.id)
                .execution_options(yield_per=1000)
            )

            total_added = 0
            for row in result.scalars():
                email = row.row_data.get(dataset.email_column)
                if not email:
                    continue
                
                try:
                    task_dict = {
                        "job_id": email_job.id,
                        "dataset_row_id": row.id,
                        "recipient_email": email.strip(),
                        "status": EmailTaskStatus.PENDING,
                        "rendered_body": render_template(email_job.prompt_template, row.row_data),
                        "rendered_subject": render_template(email_job.subject_template, row.row_data)
                    }
                    rows_buffer.append(task_dict)
                except Exception as template_err:
                    logger.warning(f"Failed to render template for row {row.id} in job {email_job_id}: {template_err}")
                    continue

                if len(rows_buffer) >= batch_size:
                    _bulk_insert_email_tasks(db, rows_buffer)
                    total_added += len(rows_buffer)
                    rows_buffer.clear()

            if rows_buffer:
                _bulk_insert_email_tasks(db, rows_buffer)
                total_added += len(rows_buffer)
                rows_buffer.clear()

            # 4. Success state
            email_job.status = EmailJobStatus.SCHEDULED
            db.commit()
            logger.info(f"Successfully generated {total_added} email tasks for job_id={email_job_id}. Job is now SCHEDULED.")

    except self.MaxRetriesExceededError:
        logger.error(f"Max retries exceeded for job_id={email_job_id}. Marking as FAILED.")
        with SyncSessionLocal() as db:
            job = db.get(EmailJob, email_job_id)
            if job:
                job.status = EmailJobStatus.FAILED
                db.commit()
    except Exception as e:
        logger.exception(f"Unexpected error processing email tasks for job_id={email_job_id}: {e}")
        # Let Celery handle general retries based on task config
        raise

def _bulk_insert_email_tasks(db, buffer):
    """Helper for batch upserts."""
    stmt = pg_insert(EmailTask).values(buffer)
    stmt = stmt.on_conflict_do_nothing(
        index_elements=['job_id', 'dataset_row_id'] 
    )
    db.execute(stmt)
    db.commit()