from typing import Any

import httpx

from app.core.config import settings
from app.integrations.base import SmsProvider


class TwilioSmsProvider(SmsProvider):
    async def send_sms(self, to: str, body: str) -> dict[str, Any]:
        if not settings.twilio_account_sid or not settings.twilio_auth_token:
            return {"sid": f"mock_{to}", "status": "queued", "mock": True}

        url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                data={"From": settings.twilio_phone_number, "To": to, "Body": body},
            )
            response.raise_for_status()
            data = response.json()
            return {"sid": data.get("sid"), "status": data.get("status", "queued")}
