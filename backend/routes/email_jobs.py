from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select,and_,desc

from db.db_connection import get_db
from db.db_models import EmailJob, EmailJobStatus, Dataset, EmailAccount, User
from dependency import get_current_user
from pydantic_models.responses import EmailJobCreateResponse
from tasks.create_email_tasks import process_email_campaign


jobs_router = APIRouter(prefix='/email-jobs')

# --- 1. PYDANTIC MODELS ---

class CreateDraftJobRequest(BaseModel):
    dataset_id: Optional[int] = None
    email_account_id: Optional[int] = None
    prompt_template: Optional[str] = None
    subject_template: Optional[str] = None

class UpdateDraftJobRequest(BaseModel):
    dataset_id: Optional[int] = None
    email_account_id: Optional[int] = None
    prompt_template: Optional[str] = None
    subject_template: Optional[str] = None

class ScheduleJobRequest(BaseModel):
    scheduled_at: Optional[datetime] = None
    throttle_per_minute: Optional[int] = 60


# --- 2. ENDPOINTS ---

@jobs_router.post("/", response_model=EmailJobCreateResponse, summary="Create a draft email job")
async def create_email_job(
    payload: CreateDraftJobRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Creates a new Job in the CREATED (draft) state."""
    
    # Optional preliminary validation if IDs are provided immediately
    if payload.dataset_id:
        res = await session.execute(select(Dataset).where(Dataset.id == payload.dataset_id, Dataset.user_id==user.id))
        if not res.scalar_one_or_none():
            raise HTTPException(404, detail="Dataset not found")

    if payload.email_account_id:
        res = await session.execute(select(EmailAccount).where(EmailAccount.id == payload.email_account_id, EmailAccount.user_id==user.id))
        if not res.scalar_one_or_none():
            raise HTTPException(404, detail="Email account not found")

    # Create the drafted email job
    job = EmailJob(
        user_id=user.id,
        dataset_id=payload.dataset_id,
        email_account_id=payload.email_account_id,
        prompt_template=payload.prompt_template,
        subject_template=payload.subject_template,
        status=EmailJobStatus.CREATED,
    )
    
    session.add(job)
    await session.commit()
    
    return EmailJobCreateResponse(
        job_id=job.id,
        status=job.status.value,
        message="Draft job created successfully",
        dataset_id=job.dataset_id,
        email_account_id=job.email_account_id
    )


@jobs_router.patch("/{job_id}", summary="Update a drafted email job")
async def update_email_job(
    job_id: int,
    payload: UpdateDraftJobRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Auto-saves progress on a campaign while it is still a draft."""
    
    result = await session.execute(select(EmailJob).where(EmailJob.id == job_id, EmailJob.user_id == user.id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(404, detail="Job not found")
        
    if job.status != EmailJobStatus.CREATED:
        raise HTTPException(400, detail="Cannot patch job. It is no longer a draft.")

    # Apply updates
    if payload.dataset_id is not None:
        job.dataset_id = payload.dataset_id
    if payload.email_account_id is not None:
        job.email_account_id = payload.email_account_id
    if payload.prompt_template is not None:
        job.prompt_template = payload.prompt_template
    if payload.subject_template is not None:
        job.subject_template = payload.subject_template

    await session.commit()
    return {"status": "success", "message": "Draft updated"}


@jobs_router.post("/{job_id}/schedule", summary="Schedule an email job for processing")
async def schedule_email_job(
    job_id: int,
    payload: ScheduleJobRequest,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Locks in the campaign and queues it for the Celery Beat task to pick up."""
    
    result = await session.execute(select(EmailJob).where(EmailJob.id == job_id, EmailJob.user_id == user.id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(404, detail="Job not found")
        
    if job.status != EmailJobStatus.CREATED:
        raise HTTPException(400, detail="Job is already scheduled or processing")

    # 1. Final Validations (Ensure user didn't leave critical fields blank)
    if not job.dataset_id:
        raise HTTPException(400, detail="Cannot schedule: Missing Dataset")
    if not job.email_account_id:
        raise HTTPException(400, detail="Cannot schedule: Missing Email Account")
    if not job.prompt_template or not job.subject_template:
        raise HTTPException(400, detail="Cannot schedule: Missing Prompt/Subject Template")

    # 2. Update config
    job.scheduled_at = payload.scheduled_at
    job.throttle_per_minute = payload.throttle_per_minute
    
    # 3. Trigger the dispatch
    job.status = EmailJobStatus.PROCESSING

    process_email_campaign.delay(job.id)
    await session.commit()
    
    # NOTE: Your Celery beat task 'tasks.schedule_campaigns' will perfectly 
    # pick up this job when 'scheduled_at' arrives. 

    return {
        "status": "scheduled", 
        "job_id": job.id, 
        "scheduled_at": job.scheduled_at
    }

@jobs_router.get('/',summary='Get all jobs for the user')
async def get_all_jobs(session: AsyncSession = Depends(get_db),user: User = Depends(get_current_user)):
    
    stmt = select(EmailJob).where(EmailJob.user_id == user.id).order_by(EmailJob.created_at.desc())
    results = await session.execute(stmt)
    results = results.scalars().all()
    
    return {
        'data':results
    }
    
@jobs_router.get('/{id}',summary='Get all jobs for the user')
async def get_job(id:int,session: AsyncSession = Depends(get_db),user: User = Depends(get_current_user)):
    
    stmt = select(EmailJob).where(EmailJob.user_id == user.id , EmailJob.id == id)
    results = await session.execute(stmt)
    results = results.scalars().one_or_none()
    
    if not results:
        raise HTTPException(404,detail='particular resource not found')
    
    return {
        'data':results
    }
    
    
