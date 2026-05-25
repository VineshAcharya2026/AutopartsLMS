from typing import Any

from prisma import Prisma
from prisma.enums import DuplicateMatchType, LeadSource, LeadStatus

from app.modules.ingestion.routing import apply_routing_rules
from app.modules.leads.dedup import find_duplicate_lead, link_duplicate
from app.modules.notifications.service import notify_lead_assignment
from app.schemas.serializers import normalize_email, normalize_phone, serialize_lead


async def ingest_lead(
    db: Prisma,
    *,
    payload: dict[str, Any],
    source: LeadSource,
    center_id: str | None = None,
    source_website: str | None = None,
    campaign: str | None = None,
) -> dict[str, Any]:
    phone = normalize_phone(payload.get("phone"))
    email = normalize_email(payload.get("email"))

    duplicate = await find_duplicate_lead(db, phone=phone, email=email, center_id=center_id)
    if duplicate:
        metadata = duplicate.metadata or {}
        history = metadata.get("inquiry_history", [])
        history.append(
            {
                "source": str(source),
                "at": str(__import__("datetime").datetime.utcnow()),
                "payload": payload,
            }
        )
        metadata["inquiry_history"] = history

        updated = await db.lead.update(
            where={"id": duplicate.id},
            data={
                "inquiryCount": duplicate.inquiryCount + 1,
                "metadata": metadata,
            },
        )

        match_type = DuplicateMatchType.PHONE if phone and duplicate.phone == phone else DuplicateMatchType.EMAIL
        await link_duplicate(db, canonical_id=duplicate.id, duplicate_id=duplicate.id, match_type=match_type)

        return {"lead": serialize_lead(updated), "duplicate": True}

    lead_data = {
        "name": payload["name"],
        "phone": phone,
        "email": email,
        "source": source,
        "status": LeadStatus.NEW,
        "centerId": center_id,
        "courseInterest": payload.get("course_interest"),
        "city": payload.get("city"),
        "message": payload.get("message"),
        "sourceWebsite": source_website or payload.get("source_website"),
        "campaign": campaign or payload.get("campaign"),
        "metadata": payload.get("metadata", {}),
        "tags": payload.get("tags", []),
    }

    lead = await db.lead.create(data=lead_data)
    lead = await apply_routing_rules(db, lead)
    await notify_lead_assignment(db, lead)

    return {"lead": serialize_lead(lead), "duplicate": False}
