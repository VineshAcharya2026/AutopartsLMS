from datetime import datetime, timezone
from typing import Any

from prisma import Prisma
from prisma.enums import LeadStatus, Role, TrashEntityType
from prisma.models import User

from app.core.audit import emit_audit
from app.db.prisma_json import to_prisma_json
from app.schemas.serializers import normalize_email, normalize_phone, serialize_lead


def build_lead_where(user: User, extra: dict | None = None) -> dict:
    where: dict[str, Any] = {"deletedAt": None}
    if extra:
        where.update(extra)

    if user.role == Role.MASTER_ADMIN:
        return where
    if user.role == Role.ADMIN:
        where["centerId"] = user.centerId
        where["assignedAdminId"] = user.id
        return where
    if user.role == Role.AGENT:
        where["assignedAgentId"] = user.id
        return where
    return where


async def list_leads(
    db: Prisma,
    user: User,
    *,
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    agent_id: str | None = None,
    search: str | None = None,
    unassigned: bool = False,
) -> dict[str, Any]:
    where = build_lead_where(user)
    if unassigned and user.role == Role.MASTER_ADMIN:
        where["assignedAdminId"] = None
    if status:
        where["status"] = status
    if agent_id:
        where["assignedAgentId"] = agent_id
    if search:
        where["OR"] = [
            {"name": {"contains": search, "mode": "insensitive"}},
            {"phone": {"contains": search}},
            {"email": {"contains": search, "mode": "insensitive"}},
        ]

    total = await db.lead.count(where=where)
    items = await db.lead.find_many(
        where=where,
        skip=(page - 1) * page_size,
        take=page_size,
        order={"createdAt": "desc"},
    )

    return {
        "items": [serialize_lead(i) for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


async def get_kanban_view(db: Prisma, user: User) -> dict[str, list]:
    where = build_lead_where(user)
    leads = await db.lead.find_many(where=where, order={"updatedAt": "desc"})
    columns: dict[str, list] = {s.value: [] for s in LeadStatus}
    for lead in leads:
        columns[lead.status].append(serialize_lead(lead))
    return columns


async def get_agent_wise_view(db: Prisma, user: User) -> dict[str, Any]:
    where = build_lead_where(user)
    leads = await db.lead.find_many(where=where, include={"assignedAgent": True})
    grouped: dict[str, list] = {}
    unassigned: list = []

    for lead in leads:
        data = serialize_lead(lead)
        if lead.assignedAgentId:
            key = lead.assignedAgentId
            grouped.setdefault(key, []).append(data)
        else:
            unassigned.append(data)

    return {"grouped": grouped, "unassigned": unassigned}


async def soft_delete_lead(
    db: Prisma,
    *,
    lead,
    user: User,
    ip_address: str | None = None,
) -> None:
    snapshot = serialize_lead(lead)
    await db.lead.update(where={"id": lead.id}, data={"deletedAt": datetime.now(timezone.utc)})
    await db.trashrecord.create(
        data={
            "entityType": TrashEntityType.LEAD,
            "entityId": lead.id,
            "snapshot": to_prisma_json(snapshot),
            "deletedById": user.id,
        }
    )
    await emit_audit(
        db,
        actor_id=user.id,
        action="LEAD_DELETED",
        entity_type="Lead",
        entity_id=lead.id,
        before=snapshot,
        ip_address=ip_address,
    )
