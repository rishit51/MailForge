from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_pagination import add_pagination
from routes.dataset import dataset_router
from routes.email_accounts import email_account_router
from routes.email_jobs import jobs_router
from routes.llm import llm_router
from routes.webhook import webhook_integration_router
from routes.users import log_router,register_router
from routes.auth import auth_service_router
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(register_router,prefix='/auth')
app.include_router(log_router,prefix='/auth')
app.include_router(dataset_router)
app.include_router(email_account_router)
app.include_router(jobs_router)
app.include_router(llm_router)
app.include_router(webhook_integration_router)
app.include_router(auth_service_router)


@app.get("/ping")
def ping():
    return {"message": "server is alive"}
