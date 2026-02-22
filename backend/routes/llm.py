import os
import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from cohere import AsyncClient
from dotenv import load_dotenv
# ======================
# Cohere Client
# ======================
load_dotenv()
client = AsyncClient(
    api_key=os.getenv("COHERE_API_KEY")
)

llm_router = APIRouter(prefix="/llm", tags=["LLM"])

# ======================
# Request / Response
# ======================
class GenerateTemplateRequest(BaseModel):
    user_prompt: str = Field(..., min_length=5)
    columns: list[str] = Field(..., min_items=1)


class GenerateTemplateResponse(BaseModel):
    subject: str
    body: str


# ======================
# Helpers
# ======================
PLACEHOLDER_REGEX = re.compile(r"\{\{(\w+)\}\}")

def validate_placeholders(text: str, allowed_columns: set[str]):
    placeholders = set(PLACEHOLDER_REGEX.findall(text))
    invalid = placeholders - allowed_columns
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid placeholders used: {sorted(invalid)}"
        )


# ======================
# Endpoint
# ======================
@llm_router.post(
    "/generate-template",
    response_model=GenerateTemplateResponse
)
async def generate_email_template(payload: GenerateTemplateRequest):
    allowed_columns = set(payload.columns)
    
    system_prompt = f"""
You are generating an email template for a bulk email campaign.

RULES (do not break these):
- Output ONLY valid JSON
- JSON must contain exactly two keys: "subject" and "body"
- Use ONLY these placeholders: {sorted(allowed_columns)}
- Placeholders must use double curly braces, e.g. {{company_name}}
- Do NOT invent new placeholders
- Do NOT include explanations, markdown, or extra text
"""
    full_prompt = f"""
    {system_prompt}

    USER PROMPT:
    {payload.user_prompt}
    """
    try:
        response = await client.chat(
            model="command-r-plus-08-2024",
            temperature=0.3,
            max_tokens=400,
            message=
                full_prompt
            ,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"LLM provider error {e}"
        ) from e

    raw_text = response.text.strip()

    # ======================
    # Parse JSON
    # ======================
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="LLM output was not valid JSON"
        )

    if "subject" not in parsed or "body" not in parsed:
        raise HTTPException(
            status_code=400,
            detail="LLM output missing required fields"
        )

    subject = parsed["subject"].strip()
    body = parsed["body"].strip()

    if not subject or not body:
        raise HTTPException(
            status_code=400,
            detail="Generated subject or body is empty"
        )

    # ======================
    # Placeholder validation
    # ======================
    validate_placeholders(subject, allowed_columns)
    validate_placeholders(body, allowed_columns)

    return GenerateTemplateResponse(
        subject=subject,
        body=body
    )
