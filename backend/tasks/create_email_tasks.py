from db.models.enums import DatasetStatus
from utilities.render_templates import render_template
from db.db_connection import SyncSessionLocal
from db.db_models import Dataset, DatasetRow ,EmailJob,EmailTask,EmailJobStatus,EmailTaskStatus
from sqlalchemy import select
from celery_app import celery_app
from sqlalchemy.dialects.postgresql import insert as pg_insert 

@celery_app.task(bind=True,name="tasks.process_email_tasks")
def process_email_campaign(self,email_job_id: int):

    batch_size = 1000
    rows_buffer = []

    with SyncSessionLocal() as db:

        result =  db.execute(
            select(EmailJob).with_for_update(skip_locked=True).where(EmailJob.id == email_job_id)
        )
        email_job = result.scalar_one_or_none()
        if email_job is None:
            return
        if email_job.status != EmailJobStatus.PROCESSING:
            return
        result =  db.execute(
            select(Dataset).where(Dataset.id == email_job.dataset_id)
        )
        dataset = result.scalar_one_or_none()
        if dataset is None:
            return
        
        if dataset.dataset_status == DatasetStatus.FAILED:
            email_job.status = EmailJobStatus.FAILED
            db.commit()
            return
        if dataset.dataset_status != DatasetStatus.COMPLETED:
            db.rollback()
            raise self.retry(countdown=10)
        
        result =  db.execute(
            select(DatasetRow).where(DatasetRow.dataset_id == dataset.id).execution_options(yield_per=1000)
        )

        for row in result.scalars():

            email = row.row_data.get(dataset.email_column)
            if not email:
                continue

            task_dict = {
                "job_id": email_job.id,
                "dataset_row_id": row.id,
                "recipient_email": email.strip(),
                "status": EmailTaskStatus.PENDING,
                "rendered_body": render_template(email_job.prompt_template, row.row_data),
                "rendered_subject": render_template(email_job.subject_template, row.row_data)
            }
            rows_buffer.append(task_dict)

            if len(rows_buffer) >= batch_size:
                stmt = pg_insert(EmailTask).values(rows_buffer)
                stmt = stmt.on_conflict_do_nothing(
                    index_elements=['job_id', 'dataset_row_id'] 
                )
                db.execute(stmt)
                db.commit()
                rows_buffer.clear()

        if rows_buffer:
                stmt = pg_insert(EmailTask).values(rows_buffer)
                stmt = stmt.on_conflict_do_nothing(
                    index_elements=['job_id', 'dataset_row_id'] 
                )
                db.execute(stmt)
                db.commit()
                rows_buffer.clear()

        email_job.status = EmailJobStatus.SCHEDULED
        db.commit()