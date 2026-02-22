# Code Cleanup & Improvement Plan

## Project Overview
This is a bulk email sender application with:
- **Backend**: FastAPI + SQLite + Celery
- **Frontend**: React + Vite
- **Features**: User auth (email, GitHub, Google), CSV datasets, LLM-generated email templates, SendGrid integration

---

## 🚨 CRITICAL Issues (Security)

### 1. Hardcoded Secrets
| File | Issue |
|------|-------|
| `backend/security.py` | `SECRET_KEY = "a_very_secret_key"` hardcoded |
| `backend/services/third_party_login.py` | GitHub & Google client secrets exposed in code |

**Fix**: Create `.env` file and use `python-dotenv`

### 2. CORS Allows All Origins
```python
allow_origins=["*"]  # In app.py
```
**Fix**: Restrict to specific frontend URL

### 3. No Environment Variable Validation
**Fix**: Use `pydantic-settings` or validate on startup

---

## 🔧 Code Quality Issues

### 1. Typos & Naming
- `auth_service_roter` → `auth_service_router` in `app.py`

### 2. Unused/Debug Code
- Print statements left in production code (`routes/llm.py`, `routes/webhook.py`)
- Empty `routes/google_login.py` file

### 3. Missing Proper Error Handling
- Some routes return generic errors
- No structured logging

### 4. Inconsistent Code
- Mixed naming conventions (snake_case vs camelCase)
- Some files missing type hints

---

## 🏗️ Architecture Improvements

### 1. Database
- Mixed async/sync usage is confusing
- Consider using only async with proper connection pooling

### 2. Template Rendering
- Currently in `routes/email_jobs.py`
- Should be in a separate service/module

### 3. Email Provider
- Only SendGrid implemented
- Gmail in enum but no implementation

### 4. Configuration
- No `.env` file
- Hardcoded values throughout

---

## 📋 Missing Features

| Feature | Status |
|---------|--------|
| Gmail OAuth implementation | Not implemented |
| Rate limiting | Missing |
| Email validation | Missing |
| Input sanitization | Basic |
| Proper logging | Missing |
| API documentation | Basic (FastAPI auto) |
| Tests | None |

---

## 📝 Cleanup Tasks

### High Priority
1. Create `.env.example` and document required variables
2. Move secrets to environment variables
3. Fix CORS configuration
4. Rename `auth_service_roter` → `auth_service_router`
5. Remove print statements

### Medium Priority
6. Add proper logging
7. Implement Gmail provider or remove from enum
8. Delete empty `google_login.py` or implement it
9. Add input validation with pydantic
10. Fix inconsistent imports

### Lower Priority
11. Refactor template rendering to service
12. Add rate limiting
13. Add email validation
14. Add unit tests
15. Add API versioning

---

## 📁 Files to Review/Edit

### Backend
- `backend/app.py` - CORS, router naming
- `backend/security.py` - Secrets
- `backend/services/third_party_login.py` - Secrets
- `backend/routes/webhook.py` - Print statement
- `backend/routes/llm.py` - Print statement
- `backend/routes/google_login.py` - Empty file
- `backend/celery_app.py` - Config
- `backend/email_jobs.py` - Template rendering

### Frontend
- `frontend/src/api/index.js` - Incomplete client

---

## ✅ Quick Wins (Can Do Now)

1. Fix typo: `auth_service_roter` → `auth_service_router`
2. Remove print statements
3. Create `.env.example`
4. Restrict CORS to localhost:5173
5. Delete empty `google_login.py`

