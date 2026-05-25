from typing import Any

import httpx

from app.core.config import settings
from app.integrations.base import EmailProvider


class ResendEmailProvider(EmailProvider):
    async def send_email(self, to: str, subject: str, body: str) -> dict[str, Any]:
        if not settings.resend_api_key:
            return {"id": f"mock_{to}", "status": "sent", "mock": True}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={
                    "from": settings.resend_from_email,
                    "to": [to],
                    "subject": subject,
                    "html": body,
                },
            )
            response.raise_for_status()
            data = response.json()
            return {"id": data.get("id"), "status": "sent"}
