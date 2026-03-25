## Detailed Email Lifecycle and Celery Tasks Documentation

### 1. Email Lifecycle Overview

The email sending system follows an **outbox pattern** with Celery orchestration, using PostgreSQL for state management. Here's the complete lifecycle of an email:

```
1. CSV Upload → process_csv_background()
   └── Creates Dataset + DatasetRows (DatasetStatus.COMPLETED)

2. Job Creation (API) → EmailJob (status=SCHEDULED)
   └── Associates Dataset + templates + account

3. Periodic Beat: schedule_campaigns()
   └── Finds SCHEDULED jobs with completed datasets
   └── Sets RUNNING + creates EmailJobAnalytics + OutboxEvent

4. process_outbox()
   └── Finds unpublished OutboxEvents → triggers run_campaign(job_id)

5. run_campaign(job_id) [Orchestrator - Throttled Batching]
   Loop:
   ├── Lock job (RUNNING)
   ├── Calculate throttle (throttle_per_minute - recent sends)
   ├── Fetch BATCH_SIZE=100 PENDING EmailTasks (skip_locked)
   ├── Set IN_PROGRESS
   ├── Queue send_single_email(task.id) for each
   └── Reschedule self (1-10s countdown)

6. API/Job trigger: process_email_campaign(job_id)
   └── Renders templates for ALL DatasetRows → Bulk insert EmailTasks (PENDING)
   └── Sets job SCHEDULED

7. send_single_email(task_id) [x1000s parallel]
   ├── Lock task (skip_locked)
   ├── Load task+job+account
   ├── send_email() via provider (Gmail/SendGrid)
   ├── Set SENT + sent_at
   ├── Create internal "sent" EmailEvent
   └── Publish real-time analytics (Gmail)

8. Webhook: process_sendgrid_events(events)
   ├── Bulk upsert EmailEvents (provider_event_id unique)
   ├── Update task status (priority-based: PENDING→SENT→DELIVERED→OPENED|BOUNCED|FAILED)
   ├── Publish Redis analytics stream: job-{id}-analytics

9. Job Completion (run_campaign detects):
   total/sent/failed/active → COMPLETED|PARTIAL_SUCCESS|FAILED
```

**Key Patterns:**
- **Skip-locked + for_update**: Distributed coordination (multiple Celery workers)
- **Throttling**: `throttle_per_minute` rate limiting
- **Bulk operations**: PostgreSQL `on_conflict_do_nothing` for idempotency
- **Outbox pattern**: Reliable async coordination
- **Event sourcing**: EmailEvents + Redis pubsub for real-time analytics

### 2. All Celery Tasks Documentation

| Task Name | File | Signature | Purpose | Key Logic |
|-----------|------|-----------|---------|-----------|
| `schedule_campaigns()` | `campaign_dispatch.py` | `@celery_app.task(name="tasks.schedule_campaigns")` | **Beat-scheduled**: Finds eligible `SCHEDULED` jobs with completed datasets, sets `RUNNING`, creates `EmailJobAnalytics` + `OutboxEvent`. | `select(EmailJob).join(Dataset).where(status=SCHEDULED, scheduled_at<=now, dataset_status=COMPLETED).with_for_update(skip_locked=True)` |
| `process_email_campaign(email_job_id)` | `create_email_tasks.py` | `@celery_app.task(bind=True,name="tasks.process_email_tasks")` | **Triggered manually/API**: Renders templates for dataset rows, bulk-inserts `EmailTask`s (PENDING). Retries if dataset not ready. Sets job `SCHEDULED`. | Batch `yield_per=1000`, `pg_insert.on_conflict_do_nothing(['job_id','dataset_row_id'])`, `render_template()`. |
| `process_sendgrid_events(events)` | `email_events.py` | `@celery_app.task(name="tasks.process_sendgrid_events")` | **SendGrid webhook**: Bulk-upserts `EmailEvent`s, updates task status by priority, publishes Redis analytics stream. | `SENDGRID_TO_STATUS` mapping, `STATUS_PRIORITY`, `pg_insert.on_conflict_do_nothing(['provider_event_id'])`, `redis.publish(f"job-{job_id}-analytics")`. |
| `send_single_email(email_task_id)` | `email_tasks.py` | `@celery_app.task(bind=True, max_retries=3, name="tasks.send_single_email")` | **Core sender**: Sends single email via provider. Retries exponentially. Creates "sent" event + real-time pubsub. | `select(EmailTask,EmailJob,EmailAccount).with_for_update(skip_locked=True)`, `send_email(account,task)`, Gmail-specific `publish_job_event`. |
| `run_campaign(job_id)` | `orchestrator.py` | `@celery_app.task(name="tasks.run_campaign")` | **Master orchestrator**: Throttled batching dispatcher. Self-reschedules. Detects job completion. | Rate limit calc, `BATCH_SIZE=100`, `skip_locked`, completion stats → status update + pubsub. |
| `process_outbox()` | `outbox_queue.py` | `@celery_app.task(name="tasks.process_outbox")` | **Beat-scheduled**: Polls `OutboxEvent(published=False)` → triggers `run_campaign`. | Simple poll + mark published. |
| `process_csv(file_path, dataset_id)` | `process_csv.py` | `@celery_app.task(name='tasks.process_csv')` | **CSV processor**: Parses CSV → bulk `DatasetRow`s → `DatasetStatus.COMPLETED`. Deletes temp file. | `batch_size=2000`, cleans/strips data, handles empty CSV failure. |

**Total: 7 Celery tasks.**

### 3. Execution Flow Diagram
```
Beat → schedule_campaigns() → OutboxEvent
         ↓
Beat → process_outbox() → run_campaign() ←∞ (throttled loop)
                            ↓ (batches)
                    send_single_email() x∞
                            ↓ (webhook)
                    process_sendgrid_events()
```

All code uses **transaction isolation** (`with_for_update(skip_locked=True)`), **idempotency** (UPSERT conflicts), and **distributed locking** for horizontal scaling.

**Documentation generated by BLACKBOXAI on [current date]. Source: tasks/ directory analysis.**

