# Email Sender - AI-Powered Bulk Email Campaign Platform

A modern, full-stack email marketing platform built with FastAPI and React that enables users to create and send personalized bulk email campaigns with AI-generated content.

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-fff?style=for-the-badge&logo=celery&logoColor=black)

## 🚀 Features

- **Dataset Management**: Upload CSV files or connect Google Sheets as recipient data sources
- **Multi-Provider Email Sending**: Support for Gmail (OAuth2) and SendGrid API
- **AI-Powered Content Generation**: Generate personalized email content using Cohere LLM API
- **Campaign Scheduling**: Schedule campaigns for later or send immediately
- **Rate Limiting/Throttling**: Control email sending speed to avoid provider limits
- **Email Tracking**: Track sent, delivered, opened, and bounced emails
- **User Authentication**: Secure JWT-based authentication with Google OAuth support

## 🏗️ Architecture

```
EmailSender/
├── backend/                 # FastAPI backend
│   ├── app.py              # Main FastAPI application
│   ├── celery_app.py       # Celery configuration
│   ├── db/                 # Database models and connections
│   │   ├── db_models.py    # SQLAlchemy models
│   │   └── models/         # Individual model files
│   ├── routes/             # API endpoints
│   │   ├── auth.py         # Authentication routes
│   │   ├── dataset.py      # Dataset management
│   │   ├── email_accounts.py # Email provider management
│   │   ├── email_jobs.py   # Campaign management
│   │   └── llm.py          # AI content generation
│   ├── services/           # Business logic
│   │   ├── email_service.py
│   │   └── auth_service.py
│   ├── tasks/              # Celery background tasks
│   │   └── email_tasks.py  # Email dispatch & sending
│   ├── email_providers/    # Email provider adapters
│   │   ├── base.py         # Abstract base class
│   │   ├── gmail.py        # Gmail OAuth adapter
│   │   └── sendgrid.py     # SendGrid API adapter
│   └── pydantic_models/    # Request/Response models
│
└── frontend/               # React + Vite frontend
    ├── src/
    │   ├── pages/          # Page components
    │   │   ├── CreateCampaign.jsx
    │   │   ├── DataSourcesPage.jsx
    │   │   └── EmailAccount.jsx
    │   ├── components/      # Reusable UI components
    │   │   ├── ui/         # Shadcn UI components
    │   │   └── StepIndicator.jsx
    │   ├── api/            # API client
    │   └── context/         # React context (Auth)
    └── package.json
```

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: FastAPI-Users with JWT
- **Task Queue**: Celery with Redis broker
- **Migrations**: Alembic
- **LLM Integration**: Cohere API
- **Email Providers**: Gmail API, SendGrid API

### Frontend
- **Framework**: React 18 + Vite
- **UI Library**: Shadcn UI + Tailwind CSS
- **State Management**: React Context
- **Routing**: React Router v6
- **HTTP Client**: Fetch API

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL
- Redis (for Celery)
- API Keys:
  - Google OAuth2 credentials
  - SendGrid API key
  - Cohere API key

## 🔧 Installation

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
alembic upgrade head

# Start the development server
uvicorn app:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📖 API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | User registration |
| `/auth/login` | POST | User login |
| `/datasets` | GET/POST | List/Create datasets |
| `/email-accounts` | GET/POST | Manage email accounts |
| `/email-jobs/` | POST | Create campaign |
| `/llm/generate-template` | POST | Generate AI email content |

## 💡 Usage Flow

1. **Upload Data**: Upload a CSV file or connect Google Sheets as your recipient list
2. **Connect Email Account**: Connect Gmail (OAuth) or SendGrid account
3. **Create Campaign**: Use the step-by-step wizard to:
   - Select recipient dataset
   - Choose sending email account
   - Compose email (manual or AI-generated)
   - Set schedule and throttling
4. **Review & Launch**: Review campaign details and launch

### AI Content Generation

The platform integrates with Cohere LLM to generate personalized email content:

```python
# Example request to /llm/generate-template
{
    "user_prompt": "Write a friendly email about our new product",
    "columns": ["name", "company", "product"]
}
```

Returns:
```json
{
    "subject": "Hi {{name}}, check out our new {{product}}!",
    "body": "Hello {{name}},\n\nI wanted to reach out about..."
}
```

## 🔐 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/emailsender
SECRET_KEY=your-secret-key
COHERE_API_KEY=your-cohere-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SENDGRID_API_KEY=your-sendgrid-key
```

### Frontend (.env)
```
VITE_BASE_URL=http://localhost:8000
```

## 🏭 Deployment

### Docker Compose (Recommended)

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis broker
- Backend API
- Frontend application

## 📝 License

MIT License

## 👤 Author

Your Name - [Your GitHub](https://github.com/yourusername)

---

<div align="center">
  Built with ❤️ using FastAPI & React
</div>

