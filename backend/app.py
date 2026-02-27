from fastapi import FastAPI, Request
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

@app.middleware("http")
async def log_requests(request: Request, call_next):
    body = await request.body()
    print("----- INCOMING REQUEST -----")
    print("URL:", request.url)
    print("Headers:", dict(request.headers))
    print("Body:", body.decode("utf-8", errors="ignore"))
    print("----------------------------")

    # Important: reattach body so FastAPI can read it again
    async def receive():
        return {"type": "http.request", "body": body}

    request._receive = receive

    response = await call_next(request)
    return response