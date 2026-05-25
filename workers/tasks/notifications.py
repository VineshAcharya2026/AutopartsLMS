import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "apps" / "api"))

from celery_app import celery_app
from app.db.prisma_client import connect_db, disconnect_db


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="tasks.notifications.mark_overdue_followups")
def mark_overdue_followups():
    async def _mark():
        db = await connect_db()
        try:
            from prisma.enums import FollowUpStatus, NotificationType
            from app.modules.notifications.service import create_notification

            now = datetime.now(timezone.utc)
            overdue = await db.followup.find_many(
                where={"status": FollowUpStatus.PENDING, "scheduledAt": {"lt": now}},
                take=100,
            )
            count = 0
            for fu in overdue:
                await db.followup.update(where={"id": fu.id}, data={"status": FollowUpStatus.OVERDUE})
                await create_notification(
                    db,
                    user_id=fu.agentId,
                    ntype=NotificationType.FOLLOW_UP_DUE,
                    title="Follow-up overdue",
                    payload={"follow_up_id": fu.id, "lead_id": fu.leadId},
                )
                count += 1
            return {"marked": count}
        finally:
            await disconnect_db()

    return run_async(_mark())
