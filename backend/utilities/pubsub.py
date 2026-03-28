import json
import logging
import redis
from config import settings

logger = logging.getLogger(__name__)

# Synchronous client (used by Celery workers)
sync_redis = redis.Redis.from_url(settings.CELERY_RESULT_BACKEND, decode_responses=True)

def publish_job_event(job_id: int, task_id: int, event_type: str, payload_data: dict):
    """
    Publishes a real-time analytics event via Redis Pub/Sub.
    """
    channel = f"job-{job_id}-analytics"
    message = {
        "email_task_id": task_id,
        "email_job_id": job_id,
        "event_type": event_type,
        "payload": payload_data
    }
    
    try:
        sync_redis.publish(channel, json.dumps(message))
    except Exception as e:
        logger.error(f"Failed to publish event to redis on channel {channel}: {e}")
