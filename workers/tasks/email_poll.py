import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "apps" / "api"))

from celery_app import celery_app
from app.db.prisma_client import connect_db, disconnect_db


def run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="tasks.email_poll.poll_all_email_integrations")
def poll_all_email_integrations():
    async def _poll():
        db = await connect_db()
        try:
            from app.integrations.email.service import poll_integration

            integrations = await db.integration.find_many(
                where={"isActive": True, "type": {"in": ["GMAIL", "OUTLOOK", "IMAP"]}}
            )
            total = 0
            for integration in integrations:
                total += await poll_integration(db, integration)
            return {"processed": total}
        finally:
            await disconnect_db()

    return run_async(_poll())


@celery_app.task(name="tasks.lead_routing.route_lead")
def route_lead_task(lead_id: str):
    async def _route():
        db = await connect_db()
        try:
            from app.modules.ingestion.routing import apply_routing_rules

            lead = await db.lead.find_first(where={"id": lead_id})
            if lead:
                await apply_routing_rules(db, lead)
        finally:
            await disconnect_db()

    return run_async(_route())
