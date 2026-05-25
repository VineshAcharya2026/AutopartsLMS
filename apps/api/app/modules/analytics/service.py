from datetime import datetime, timezone
from typing import Any

from prisma import Prisma
from prisma.enums import Role

from app.core.audit import emit_audit
from app.modules.leads.service import build_lead_where


async def get_dashboard_stats(db: Prisma, user) -> dict[str, Any]:
    where = build_lead_where(user)
    leads = await db.lead.find_many(where=where)

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    leads_by_status: dict[str, int] = {}
    leads_by_source: dict[str, int] = {}

    for lead in leads:
        leads_by_status[lead.status] = leads_by_status.get(lead.status, 0) + 1
        leads_by_source[lead.source] = leads_by_source.get(lead.source, 0) + 1

    follow_ups_today = sum(
        1 for l in leads if l.followUpAt and l.followUpAt.date() == today_start.date()
    )
    overdue = sum(
        1 for l in leads if l.followUpAt and l.followUpAt < datetime.now(timezone.utc)
    )

    agent_productivity = []
    if user.role in (Role.MASTER_ADMIN, Role.ADMIN):
        agent_where = {"role": Role.AGENT, "deletedAt": None}
        if user.role == Role.ADMIN:
            agent_where["centerId"] = user.centerId
        agents = await db.user.find_many(where=agent_where)
        for agent in agents:
            agent_leads = [l for l in leads if l.assignedAgentId == agent.id]
            agent_productivity.append(
                {
                    "agent_id": agent.id,
                    "name": f"{agent.firstName} {agent.lastName}",
                    "total_leads": len(agent_leads),
                    "converted": sum(1 for l in agent_leads if l.status == "CONVERTED"),
                }
            )

    stats: dict[str, Any] = {
        "total_leads": len(leads),
        "new_leads": leads_by_status.get("NEW", 0),
        "follow_ups_today": follow_ups_today,
        "overdue_tasks": overdue,
        "converted_leads": leads_by_status.get("CONVERTED", 0),
        "leads_by_status": leads_by_status,
        "leads_by_source": leads_by_source,
        "agent_productivity": agent_productivity,
        "unassigned_to_admin": 0,
        "unassigned_to_agent": 0,
        "trash_count": 0,
    }

    if user.role == Role.MASTER_ADMIN:
        all_leads = await db.lead.find_many(where={"deletedAt": None})
        stats["unassigned_to_admin"] = sum(1 for l in all_leads if not l.assignedAdminId)
        stats["trash_count"] = await db.trashrecord.count(
            where={"restoredAt": None, "purgedAt": None}
        )
    elif user.role == Role.ADMIN:
        stats["unassigned_to_agent"] = sum(1 for l in leads if not l.assignedAgentId)

    return stats
