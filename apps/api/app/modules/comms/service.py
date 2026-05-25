from typing import Any

from prisma import Prisma
from prisma.enums import CommDirection

from app.integrations.resend.email import ResendEmailProvider
from app.integrations.twilio.sms import TwilioSmsProvider


sms_provider = TwilioSmsProvider()
email_provider = ResendEmailProvider()


async def send_sms(db: Prisma, *, lead, body: str) -> dict[str, Any]:
    if not lead.phone:
        raise ValueError("Lead has no phone number")

    result = await sms_provider.send_sms(lead.phone, body)
    message = await db.smsmessage.create(
        data={
            "leadId": lead.id,
            "direction": CommDirection.OUTBOUND,
            "body": body,
            "twilioSid": result.get("sid"),
            "status": result.get("status", "queued"),
        }
    )
    return {"id": message.id, **result}


async def send_email(db: Prisma, *, lead, subject: str, body: str) -> dict[str, Any]:
    if not lead.email:
        raise ValueError("Lead has no email address")

    result = await email_provider.send_email(lead.email, subject, body)
    message = await db.emailmessage.create(
        data={
            "leadId": lead.id,
            "direction": CommDirection.OUTBOUND,
            "subject": subject,
            "body": body,
            "resendId": result.get("id"),
            "status": result.get("status", "sent"),
        }
    )
    return {"id": message.id, **result}


async def get_lead_timeline(db: Prisma, lead_id: str) -> list[dict[str, Any]]:
    sms = await db.smsmessage.find_many(where={"leadId": lead_id}, order={"createdAt": "desc"})
    emails = await db.emailmessage.find_many(where={"leadId": lead_id}, order={"createdAt": "desc"})
    calls = await db.calllog.find_many(where={"leadId": lead_id}, order={"createdAt": "desc"})
    remarks = await db.remark.find_many(
        where={"leadId": lead_id, "deletedAt": None},
        order={"createdAt": "desc"},
    )

    items: list[dict[str, Any]] = []

    for msg in sms:
        items.append(
            {
                "id": msg.id,
                "channel": "SMS",
                "direction": msg.direction,
                "title": "SMS",
                "body": msg.body,
                "status": msg.status,
                "created_at": msg.createdAt,
            }
        )
    for msg in emails:
        items.append(
            {
                "id": msg.id,
                "channel": "EMAIL",
                "direction": msg.direction,
                "title": msg.subject,
                "body": msg.body,
                "status": msg.status,
                "created_at": msg.createdAt,
            }
        )
    for call in calls:
        items.append(
            {
                "id": call.id,
                "channel": "CALL",
                "direction": call.direction,
                "title": "Call",
                "body": call.outcome or f"Duration: {call.duration}s",
                "status": None,
                "created_at": call.createdAt,
            }
        )
    for remark in remarks:
        items.append(
            {
                "id": remark.id,
                "channel": "REMARK",
                "direction": "OUTBOUND",
                "title": "Remark",
                "body": remark.body,
                "status": None,
                "created_at": remark.createdAt,
            }
        )

    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items
