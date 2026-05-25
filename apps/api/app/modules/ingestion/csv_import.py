import csv
import io
from typing import Any

from prisma import Prisma
from prisma.enums import LeadSource

from app.modules.ingestion.service import ingest_lead


async def import_leads_from_csv(
    db: Prisma,
    *,
    content: str,
    center_id: str | None = None,
) -> dict[str, Any]:
    reader = csv.DictReader(io.StringIO(content))
    created = 0
    duplicates = 0
    errors: list[str] = []

    for idx, row in enumerate(reader, start=2):
        name = (row.get("name") or row.get("Name") or "").strip()
        if not name:
            errors.append(f"Row {idx}: missing name")
            continue

        payload = {
            "name": name,
            "phone": row.get("phone") or row.get("Phone"),
            "email": row.get("email") or row.get("Email"),
            "course_interest": row.get("course_interest") or row.get("Course"),
            "city": row.get("city") or row.get("City"),
            "message": row.get("message") or row.get("Message"),
        }

        try:
            result = await ingest_lead(
                db,
                payload=payload,
                source=LeadSource.CSV,
                center_id=center_id,
            )
            if result["duplicate"]:
                duplicates += 1
            else:
                created += 1
        except Exception as exc:
            errors.append(f"Row {idx}: {exc}")

    return {"created": created, "duplicates": duplicates, "errors": errors}
