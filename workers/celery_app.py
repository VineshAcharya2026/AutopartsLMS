import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "apps" / "api"))

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery("centercrm", broker=settings.redis_url, backend=settings.redis_url)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    imports=[
        "tasks.email_poll",
        "tasks.scheduled_comms",
        "tasks.notifications",
        "tasks.lead_routing",
    ],
)

celery_app.conf.beat_schedule = {
    "poll-email-integrations": {
        "task": "tasks.email_poll.poll_all_email_integrations",
        "schedule": crontab(minute="*/5"),
    },
    "process-scheduled-messages": {
        "task": "tasks.scheduled_comms.process_scheduled_messages",
        "schedule": crontab(minute="*"),
    },
    "mark-overdue-followups": {
        "task": "tasks.notifications.mark_overdue_followups",
        "schedule": crontab(minute="0", hour="*"),
    },
}
