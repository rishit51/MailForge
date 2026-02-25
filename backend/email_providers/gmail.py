import json
import base64

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from email.mime.text import MIMEText

from db.models.email_task import EmailTask
from email_providers.base import BaseEmailProviderAdapter
from sqlalchemy.orm import Session
from db.db_connection import get_sync_db
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")


class GmailAdapter(BaseEmailProviderAdapter):

    def send(self, task: EmailTask):
        with get_sync_db() as session:

            creds = Credentials(
                token=self.account.config["access_token"],
                refresh_token=self.account.config["refresh_token"],
                token_uri="https://oauth2.googleapis.com/token",
                client_id=GOOGLE_CLIENT_ID,
                client_secret=GOOGLE_CLIENT_SECRET,
                scopes=[
                    "https://www.googleapis.com/auth/gmail.send"
                ],
            )

            if creds.expired and creds.refresh_token:

                creds.refresh(Request())

                self.account.config = json.loads(
                    creds.to_json()
                )

                session.add(self.account)
                session.commit()

            service = build(
                "gmail",
                "v1",
                credentials=creds,
            )

            message = MIMEText(task.rendered_body)

            message["to"] = task.recipient_email
            message["from"] = self.account.email_address
            message["subject"] = task.rendered_subject

            raw = base64.urlsafe_b64encode(
                message.as_bytes()
            ).decode()

            service.users().messages().send(
                userId="me",
                body={"raw": raw},
            ).execute()
            session = get_sync_db()
            creds = Credentials(
            token=self.account.config["access_token"],
            refresh_token=self.account.config["refresh_token"],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=[
                "https://www.googleapis.com/auth/gmail.send"
    ],
)
            if creds.expired and creds.refresh_token:

                creds.refresh(Request())

                self.account.config = json.loads(
                    creds.to_json()
                )
                session.add(self.account)
                session.commit()

            service = build(
                "gmail",
                "v1",
                credentials=creds,
            )

            message = MIMEText(task.rendered_body)

            message["to"] = task.recipient_email
            message["from"] = self.account.email_address
            message["subject"] = task.rendered_subject

            # ---- 5️⃣ Encode message ----
            raw = base64.urlsafe_b64encode(
                message.as_bytes()
            ).decode()

            body = {
                "raw": raw
            }

            service.users().messages().send(
                userId="me",
                body=body,
            ).execute()
