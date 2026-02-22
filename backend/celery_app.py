# celery_app.py
from celery import Celery

celery_app = Celery(
    "email_sender",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
        include=["tasks.email_tasks"],  # <-- THIS is the key line

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
    "dispatch-emails-every-10-seconds": {
        "task": "tasks.dispatch_emails",
        "schedule": 10.0,   # seconds
        "options": {"queue": "celery"},
    }
}
