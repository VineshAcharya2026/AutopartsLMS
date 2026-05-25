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


@celery_app.task(name="tasks.scheduled_comms.process_scheduled_messages")
def process_scheduled_messages():
    async def _process():
        db = await connect_db()
        try:
            from app.modules.comms.service import send_email, send_sms

            now = datetime.now(timezone.utc)
            pending = await db.scheduledmessage.find_many(
                where={"status": "pending", "scheduledAt": {"lte": now}},
                take=50,
            )
            sent = 0
            for msg in pending:
                lead = await db.lead.find_first(where={"id": msg.leadId})
                if not lead:
                    continue
                try:
                    if msg.channel == "SMS":
                        await send_sms(db, lead=lead, body=msg.body)
                    elif msg.channel == "EMAIL":
                        await send_email(db, lead=lead, subject=msg.subject or "Follow up", body=msg.body)
                    await db.scheduledmessage.update(
                        where={"id": msg.id},
                        data={"status": "sent", "sentAt": now},
                    )
                    sent += 1
                except Exception as exc:
                    await db.scheduledmessage.update(
                        where={"id": msg.id},
                        data={"status": "failed"},
                    )
            return {"sent": sent}
        finally:
            await disconnect_db()

    return run_async(_process())
