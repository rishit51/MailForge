# TODO: Refactor db/db_models.py into clean modules

## Step 1: Create base.py
- [x] Create backend/db/models/base.py with Base class

## Step 2: Create enums.py
- [x] Create backend/db/models/enums.py with SourceType, EmailProvider, EmailJobStatus, EmailTaskStatus

## Step 3: Create model files
- [x] Create backend/db/models/user.py with User model
- [x] Create backend/db/models/dataset.py with Dataset and DatasetRow models
- [x] Create backend/db/models/email_account.py with EmailAccount model
- [x] Create backend/db/models/email_job.py with EmailJob model
- [x] Create backend/db/models/email_task.py with EmailTask model
- [x] Create backend/db/models/email_event.py with EmailEvent model

## Step 4: Update __init__.py
- [x] Update backend/db/models/__init__.py to export all models and enums

## Step 5: Update db_models.py
- [x] Update backend/db/db_models.py to re-export from models for backward compatibility

## Step 6: Verify compilation
- [x] Verify all new model files compile successfully

