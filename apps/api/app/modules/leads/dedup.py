from prisma import Prisma
from prisma.enums import DuplicateMatchType


async def find_duplicate_lead(
    db: Prisma,
    *,
    phone: str | None,
    email: str | None,
    center_id: str | None,
) -> any:
    where: dict = {"deletedAt": None}
    if center_id:
        where["centerId"] = center_id

    if phone:
        found = await db.lead.find_first(where={**where, "phone": phone})
        if found:
            return found

    if email:
        found = await db.lead.find_first(where={**where, "email": email})
        if found:
            return found

    return None


async def link_duplicate(
    db: Prisma,
    *,
    canonical_id: str,
    duplicate_id: str,
    match_type: DuplicateMatchType,
) -> None:
    if canonical_id == duplicate_id:
        return
    existing = await db.leadduplicate.find_first(
        where={"canonicalLeadId": canonical_id, "duplicateLeadId": duplicate_id}
    )
    if existing:
        return
    await db.leadduplicate.create(
        data={
            "canonicalLeadId": canonical_id,
            "duplicateLeadId": duplicate_id,
            "matchType": match_type,
        }
    )
