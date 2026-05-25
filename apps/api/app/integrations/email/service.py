from datetime import datetime, timezone

from prisma import Prisma
from prisma.enums import IntegrationType, LeadSource, ParseStatus

from app.integrations.email.parser.pipeline import parse_email_content
from app.integrations.email.providers import get_email_provider
from app.modules.ingestion.service import ingest_lead


async def process_incoming_email(
    db: Prisma,
    *,
    integration_id: str,
    external_id: str | None,
    subject: str,
    body: str,
    from_address: str,
    raw_content: str,
    center_id: str | None = None,
) -> dict:
    incoming = await db.incomingemail.create(
        data={
            "integrationId": integration_id,
            "externalId": external_id,
            "rawContent": raw_content,
            "parseStatus": ParseStatus.PENDING,
        }
    )

    try:
        parsed = parse_email_content(subject=subject, body=body, from_address=from_address)
        if not parsed.get("name"):
            raise ValueError("Could not extract lead name")

        result = await ingest_lead(
            db,
            payload=parsed,
            source=LeadSource.EMAIL,
            center_id=center_id,
        )

        await db.incomingemail.update(
            where={"id": incoming.id},
            data={
                "parseStatus": ParseStatus.SUCCESS,
                "parsedLeadId": result["lead"]["id"],
                "processedAt": datetime.now(timezone.utc),
            },
        )
        return {"success": True, "lead": result["lead"]}
    except Exception as exc:
        await db.incomingemail.update(
            where={"id": incoming.id},
            data={
                "parseStatus": ParseStatus.FAILED,
                "parseError": str(exc),
                "processedAt": datetime.now(timezone.utc),
            },
        )
        return {"success": False, "error": str(exc)}


async def poll_integration(db: Prisma, integration) -> int:
    if integration.type not in (IntegrationType.GMAIL, IntegrationType.OUTLOOK, IntegrationType.IMAP):
        return 0

    provider = get_email_provider(integration.type, integration.config or {})
    emails = await provider.fetch_unread()
    processed = 0

    for email in emails:
        await process_incoming_email(
            db,
            integration_id=integration.id,
            external_id=email.get("id"),
            subject=email.get("subject", ""),
            body=email.get("body", ""),
            from_address=email.get("from", ""),
            raw_content=email.get("raw", ""),
            center_id=integration.centerId,
        )
        if email.get("id"):
            await provider.mark_processed(email["id"])
        processed += 1

    return processed
