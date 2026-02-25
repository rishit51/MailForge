from email_providers.base import BaseEmailProviderAdapter
from db.db_models import EmailTask
from db.db_models import *
from sendgrid import Mail,SendGridAPIClient,CustomArg

class SendGridAdapter(BaseEmailProviderAdapter):
    def send(self, task: EmailTask):
        message = Mail(
            from_email=self.account.email_address,
            to_emails=task.recipient_email,
            subject=task.rendered_subject,
            plain_text_content=task.rendered_body,
        )

        message.add_custom_arg(CustomArg("email_task_id", str(task.id)))
        message.add_custom_arg(CustomArg("email_job_id", str(task.job_id)))

        client = SendGridAPIClient(self.secrets["api_key"])
        client.send(message)
