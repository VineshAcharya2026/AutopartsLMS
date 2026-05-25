from typing import Any

from prisma import Prisma
from prisma.enums import NotificationType

from app.core.redis_client import publish_user_notification


async def create_notification(
    db: Prisma,
    *,
    user_id: str,
    ntype: NotificationType,
    title: str,
    payload: dict[str, Any],
) -> None:
    notification = await db.notification.create(
        data={
            "userId": user_id,
            "type": ntype,
            "title": title,
            "payload": payload,
        }
    )
    await publish_user_notification(
        user_id,
        {
            "id": notification.id,
            "type": notification.type,
            "title": notification.title,
            "payload": notification.payload or {},
            "created_at": notification.createdAt.isoformat(),
        },
    )


async def notify_lead_assignment(db: Prisma, lead, assigned_by: str | None = None) -> None:
    recipients: list[str] = []
    if lead.assignedAgentId:
        recipients.append(lead.assignedAgentId)
    if lead.assignedAdminId:
        recipients.append(lead.assignedAdminId)

    for user_id in set(recipients):
        await create_notification(
            db,
            user_id=user_id,
            ntype=NotificationType.LEAD_ASSIGNED,
            title=f"Lead assigned: {lead.name}",
            payload={"lead_id": lead.id, "assigned_by": assigned_by},
        )
