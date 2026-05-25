import json
from typing import Any

from prisma import Prisma


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
        data["actor"] = {"connect": {"id": actor_id}}
    if before is not None:
        data["before"] = json.loads(json.dumps(before, default=str))
    if after is not None:
        data["after"] = json.loads(json.dumps(after, default=str))
    if ip_address is not None:
        data["ipAddress"] = ip_address

    await db.auditlog.create(data=data)
