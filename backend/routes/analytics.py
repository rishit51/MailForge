import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
import redis.asyncio as redis
from sqlalchemy import select
from config import settings
from db.db_connection import get_db
from db.models.email_job import EmailJob
from db.models.email_job_analytics import EmailJobAnalytics
from dependency import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic_models.responses import EmailJobAnalyticsResponse

logger = logging.getLogger(__name__)

analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])

@analytics_router.get("/{job_id}/events/stream", summary="Live stream job analytics via SSE")
async def stream_job_analytics(job_id: int, request: Request):
    """
    Connects to Redis Pub/Sub to listen for real-time events for a specific job
    and streams them to the client via Server-Sent Events (SSE).
    """
    async def event_generator():
        redis_client = redis.from_url(settings.CELERY_RESULT_BACKEND, decode_responses=True)
        pubsub = redis_client.pubsub()
        channel = f"job-{job_id}-analytics"
        
        await pubsub.subscribe(channel)
        logger.info(f"Subscribed to Redis channel: {channel}")
        
        try:
            while True:
                if await request.is_disconnected():
                    break
                    
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message is not None:
                    data = message["data"]
                    yield f"data: {data}\n\n"
                    
                await asyncio.sleep(0.1) 
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error streaming analytics for job {job_id}: {e}")
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
            # Handle backward compatibility for redis client close 
            if hasattr(redis_client, 'aclose'):
                await redis_client.aclose()
            else:
                await redis_client.close()
            logger.info(f"Unsubscribed from Redis channel: {channel}")

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    })


@analytics_router.get("/{job_id}",response_model=EmailJobAnalyticsResponse)
async def get_job_analytics(
    job_id: int,
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(EmailJobAnalytics)
        .join(EmailJob, EmailJobAnalytics.job_id == EmailJob.id)
        .where(
            EmailJob.id == job_id,
            EmailJob.user_id == user.id 
        )
    )

    result = await db.execute(query)
    analytics = result.scalar_one_or_none()

    if not analytics:
        raise HTTPException(status_code=404, detail="Not found")

    return analytics