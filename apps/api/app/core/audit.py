from typing import Any

from prisma import Prisma

from app.db.prisma_json import to_prisma_json


async def emit_audit(
    db: Prisma,
    *,
    actor_id: str | None,
    action: str,
    entity_type: str,
    entity_id: str,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    data: dict[str, Any] = {
        "action": action,
        "entityType": entity_type,
        "entityId": entity_id,
    }
    if actor_id is not None:
        data["actorId"] = actor_id
    if before is not None:
        data["before"] = to_prisma_json(before)
    if after is not None:
        data["after"] = to_prisma_json(after)
    if ip_address is not None:
        data["ipAddress"] = ip_address

    await db.auditlog.create(data=data)
