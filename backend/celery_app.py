from celery import Celery
from config import settings

# Load from environment variables, fallback to local dev defaults
BROKER_URL = settings.CELERY_BROKER_URL
BACKEND_URL = settings.CELERY_RESULT_BACKEND

celery_app = Celery(
    "email_sender",
    broker=BROKER_URL,
    backend=BACKEND_URL,
    include=[
        "tasks.email_tasks",
        "tasks.create_email_tasks",
        "tasks.process_csv",
        "tasks.campaign_dispatch",
        "tasks.outbox_queue",
        "tasks.orchestrator",
        "tasks.email_events", 
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    
    # Optional but highly recommended: Route tasks to different queues
    task_routes={
        'tasks.process_sendgrid_events': {'queue': 'webhooks'},
        'tasks.process_csv': {'queue': 'data_processing'},
    }
)

celery_app.conf.beat_schedule = {
    "schedule-campaigns": {
        "task": "tasks.schedule_campaigns",
        "schedule": 60.0,
    },
    "process-outbox": {
        "task": "tasks.process_outbox",
        "schedule": 5.0,
    },
}