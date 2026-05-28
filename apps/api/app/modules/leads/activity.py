from datetime import datetime
from typing import Any

from prisma import Prisma
from prisma.enums import LeadStatus

TERMINAL_STATUSES = {
    LeadStatus.CONVERTED,
    LeadStatus.LOST,
    LeadStatus.NOT_INTERESTED,
    LeadStatus.SPAM,
}


async def build_lead_activity_timeline(db: Prisma, lead_id: str) -> list[dict[str, Any]]:
    lead = await db.lead.find_first(where={"id": lead_id})
    if not lead:
        return []

    items: list[dict[str, Any]] = []

    items.append(
        {
            "id": f"created-{lead_id}",
            "channel": "SYSTEM",
            "direction": "INBOUND",
            "title": "Lead received",
            "body": f"Source: {lead.source}"
            + (f" · {lead.sourceWebsite}" if lead.sourceWebsite else ""),
            "status": str(lead.status),
            "actor_name": None,
            "created_at": lead.createdAt,
        }
    )

    sms = await db.smsmessage.find_many(where={"leadId": lead_id}, order={"createdAt": "desc"})
    emails = await db.emailmessage.find_many(where={"leadId": lead_id}, order={"createdAt": "desc"})
    calls = await db.calllog.find_many(where={"leadId": lead_id}, order={"createdAt": "desc"})
    remarks = await db.remark.find_many(
        where={"leadId": lead_id, "deletedAt": None},
        order={"createdAt": "desc"},
    )
    follow_ups = await db.followup.find_many(where={"leadId": lead_id}, order={"createdAt": "desc"})
    audits = await db.auditlog.find_many(
        where={"entityType": "Lead", "entityId": lead_id},
        order={"createdAt": "desc"},
        take=50,
    )

    user_ids: set[str] = set()
    for r in remarks:
        user_ids.add(r.authorId)
    for a in audits:
        if a.actorId:
            user_ids.add(a.actorId)
    for f in follow_ups:
        user_ids.add(f.agentId)

    users_by_id: dict[str, Any] = {}
    if user_ids:
        users = await db.user.find_many(where={"id": {"in": list(user_ids)}})
        users_by_id = {
            u.id: f"{u.firstName} {u.lastName}".strip() or u.email for u in users
        }

    for msg in sms:
        items.append(
            {
                "id": msg.id,
                "channel": "SMS",
                "direction": str(msg.direction),
                "title": "SMS",
                "body": msg.body,
                "status": msg.status,
                "actor_name": None,
                "created_at": msg.createdAt,
            }
        )
    for msg in emails:
        items.append(
            {
                "id": msg.id,
                "channel": "EMAIL",
                "direction": str(msg.direction),
                "title": msg.subject or "Email",
                "body": msg.body,
                "status": msg.status,
                "actor_name": None,
                "created_at": msg.createdAt,
            }
        )
    for call in calls:
        items.append(
            {
                "id": call.id,
                "channel": "CALL",
                "direction": str(call.direction),
                "title": "Phone call",
                "body": call.outcome or f"Duration: {call.duration}s",
                "status": None,
                "actor_name": None,
                "created_at": call.createdAt,
            }
        )
    for remark in remarks:
        items.append(
            {
                "id": remark.id,
                "channel": "REMARK",
                "direction": "OUTBOUND",
                "title": "Agent remark",
                "body": remark.body,
                "status": None,
                "actor_name": users_by_id.get(remark.authorId),
                "created_at": remark.createdAt,
            }
        )
    for fu in follow_ups:
        items.append(
            {
                "id": fu.id,
                "channel": "FOLLOW_UP",
                "direction": "OUTBOUND",
                "title": f"Follow-up ({fu.status})",
                "body": fu.notes or f"Scheduled {fu.scheduledAt.isoformat()}",
                "status": str(fu.status),
                "actor_name": users_by_id.get(fu.agentId),
                "created_at": fu.createdAt,
            }
        )

    action_labels = {
        "LEAD_CREATED": "Lead created",
        "LEAD_UPDATED": "Lead updated",
        "LEAD_ASSIGNED": "Assignment changed",
        "LEAD_CALL_LOGGED": "Call logged",
    }
    for log in audits:
        if log.action not in action_labels:
            continue
        after = log.after or {}
        detail = ""
        if log.action == "LEAD_ASSIGNED":
            detail = "Routing / assignment updated"
        elif log.action == "LEAD_UPDATED" and isinstance(after, dict):
            if after.get("status"):
                detail = f"Status → {after.get('status')}"
            else:
                detail = "Lead details updated"
        items.append(
            {
                "id": log.id,
                "channel": "AUDIT",
                "direction": "OUTBOUND",
                "title": action_labels[log.action],
                "body": detail or log.action,
                "status": None,
                "actor_name": users_by_id.get(log.actorId) if log.actorId else None,
                "created_at": log.createdAt,
            }
        )

    items.sort(key=lambda x: x["created_at"] if isinstance(x["created_at"], datetime) else datetime.min, reverse=True)
    return items
