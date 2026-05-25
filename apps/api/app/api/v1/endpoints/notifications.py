from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from prisma import Prisma

from app.core.deps import get_current_user
from app.db.prisma_client import get_db
from app.schemas.common import NotificationResponse

router = APIRouter()


@router.get("")
async def list_notifications(
    unread_only: bool = False,
    db: Prisma = Depends(get_db),
    user=Depends(get_current_user),
):
    where = {"userId": user.id}
    if unread_only:
        where["readAt"] = None
    items = await db.notification.find_many(where=where, order={"createdAt": "desc"}, take=50)
    return [
        NotificationResponse(
            id=n.id,
            type=n.type,
            title=n.title,
            payload=n.payload or {},
            read_at=n.readAt,
            created_at=n.createdAt,
        )
        for n in items
    ]


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, db: Prisma = Depends(get_db), user=Depends(get_current_user)):
    notification = await db.notification.update(
        where={"id": notification_id},
        data={"readAt": datetime.now(timezone.utc)},
    )
    return {"id": notification.id, "read_at": notification.readAt}
