from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic_models.email_jobs import CreateEmailJobRequest
from db.db_connection import get_db
from db.db_models import EmailJob,EmailJobStatus
from sqlalchemy import select
from db.db_models import Dataset,DatasetRow, EmailTask, EmailAccount,EmailTaskStatus,User
from dependency import get_current_user
jobs_router = APIRouter(prefix='/email-jobs')

@jobs_router.post("/")
async def create_email_job(
    payload: CreateEmailJobRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Create an email job and queue it for background processing.

    This endpoint:
    1. Validates the dataset exists
    2. Creates the EmailJob record
    3. Queues a Celery task to process all emails
    4. Returns immediately
    """

    # Validate dataset exists
    result = await session.execute(
        select(Dataset).where(Dataset.id == payload.dataset_id).where(Dataset.user_id==user.id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail=f"Dataset {payload.dataset_id} not found",
        )

    # Validate email account exists
    account = await session.execute(
        select(EmailAccount).where(EmailAccount.id==payload.email_account_id).where(EmailAccount.user_id==user.id)
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail=f"Email account {payload.email_account_id} not found",
        )

    # Create the email job
    job = EmailJob(
        dataset_id=payload.dataset_id,
        email_account_id=payload.email_account_id,
        user_id=user.id,
        prompt_template=payload.prompt_template,
        subject_template=payload.subject_template,
        scheduled_at=payload.scheduled_at,
        throttle_per_minute=payload.throttle_per_minute,
        status=EmailJobStatus.SCHEDULED,
    )
    session.add(job)
    await session.commit()
    result = await session.execute(
        select(DatasetRow).where(DatasetRow.dataset_id == dataset.id)
    )
    rows = result.scalars().all()

    if not rows:
        raise HTTPException(400, detail="Dataset has no rows")

    if len(rows) > 5000:
        raise HTTPException(
            400,
            detail="Dataset too large for synchronous job creation"
        )

    # 5. Create EmailTasks
    tasks = []
    for row in rows:
        recipient = row.row_data.get(dataset.email_column)

        if not recipient:
            continue  # skip rows without email

        tasks.append(
            EmailTask(
                job_id=job.id,
                dataset_row_id=row.id,
                recipient_email=recipient.strip(),
                status=EmailTaskStatus.PENDING,
                rendered_body=render_template(job.prompt_template,row.row_data),
                rendered_subject=render_template(job.subject_template,row.row_data)
            )
        )

    if not tasks:
        raise HTTPException(
            400,
            detail="No valid recipient emails found in dataset"
        )

    session.add_all(tasks)
    await session.commit()
    
    await session.refresh(job)

    return {
        "job_id": job.id,
        "status": job.status.value,
        "message": "Job created and queued for processing",
        "dataset_id": payload.dataset_id,
        "email_account_id": payload.email_account_id,
    }
    
def render_template(template: str, data: dict) -> str:
    if not template:
        return ""
    result = template
    for key, value in data.items():
        result = result.replace(f"{{{key}}}", str(value))
    return result