from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from prisma import Prisma
from prisma.enums import Role, TrashEntityType

from app.core.audit import emit_audit
from app.core.deps import get_client_ip
from app.core.permissions import require_roles
from app.db.prisma_client import get_db
from app.modules.analytics.service import get_dashboard_stats
from app.schemas.common import CenterCreate, CenterResponse, CenterUpdate, DashboardStats
from app.schemas.serializers import serialize_center

router = APIRouter()


@router.get("")
async def list_centers(db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN))):
    centers = await db.center.find_many(where={"deletedAt": None}, order={"name": "asc"})
    return [serialize_center(c) for c in centers]


@router.post("", response_model=CenterResponse)
async def create_center(
    payload: CenterCreate,
    request: Request,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN)),
):
    existing = await db.center.find_first(where={"code": payload.code})
    if existing:
        raise HTTPException(status_code=400, detail="Center code already exists")

    center = await db.center.create(
        data={"name": payload.name, "code": payload.code, "settings": payload.settings}
    )
    await emit_audit(db, actor_id=user.id, action="CENTER_CREATED", entity_type="Center", entity_id=center.id, after=serialize_center(center), ip_address=get_client_ip(request))
    return CenterResponse(**serialize_center(center))


@router.get("/{center_id}")
async def get_center(center_id: str, db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN))):
    if user.role == Role.ADMIN and user.centerId != center_id:
        raise HTTPException(status_code=403, detail="Access denied")
    center = await db.center.find_first(where={"id": center_id, "deletedAt": None})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")
    return serialize_center(center)


@router.patch("/{center_id}")
async def update_center(
    center_id: str,
    payload: CenterUpdate,
    request: Request,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN)),
):
    data = {}
    if payload.name:
        data["name"] = payload.name
    if payload.code:
        data["code"] = payload.code
    if payload.settings is not None:
        data["settings"] = payload.settings
    center = await db.center.update(where={"id": center_id}, data=data)
    await emit_audit(db, actor_id=user.id, action="CENTER_UPDATED", entity_type="Center", entity_id=center_id, after=serialize_center(center), ip_address=get_client_ip(request))
    return serialize_center(center)


@router.delete("/{center_id}")
async def delete_center(
    center_id: str,
    request: Request,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN)),
):
    center = await db.center.find_first(where={"id": center_id, "deletedAt": None})
    if not center:
        raise HTTPException(status_code=404, detail="Center not found")

    snapshot = serialize_center(center)
    await db.center.update(where={"id": center_id}, data={"deletedAt": datetime.now(timezone.utc)})
    await db.trashrecord.create(
        data={"entityType": TrashEntityType.CENTER, "entityId": center_id, "snapshot": snapshot, "deletedById": user.id}
    )
    await emit_audit(db, actor_id=user.id, action="CENTER_DELETED", entity_type="Center", entity_id=center_id, before=snapshot, ip_address=get_client_ip(request))
    return {"message": "Center moved to trash"}


@router.get("/{center_id}/analytics", response_model=DashboardStats)
async def center_analytics(center_id: str, db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN))):
    if user.role == Role.ADMIN and user.centerId != center_id:
        raise HTTPException(status_code=403, detail="Access denied")
    stats = await get_dashboard_stats(db, user)
    return DashboardStats(**stats)
