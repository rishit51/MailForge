# celery_app.py
from celery import Celery

celery_app = Celery(
    "email_sender",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
        include=["tasks.email_tasks","tasks.create_email_tasks","tasks.process_csv","tasks.campaign_dispatch","tasks.outbox_queue","tasks.orchestrator"],  # <-- THIS is the key line

)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)

celery_app.conf.beat_schedule = {
    "schedule-campaigns": {
        "task": "tasks.schedule_campaigns",
        "schedule": 60.0,  # every 60 seconds
    },
    "process-outbox": {
        "task": "tasks.process_outbox",
        "schedule": 5.0,   # every 5 seconds
    },
}
