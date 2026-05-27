import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from prisma import Prisma
from prisma.enums import Role, TrashEntityType

from app.core.audit import emit_audit
from app.core.deps import get_client_ip, get_current_user
from app.core.permissions import require_roles
from app.core.security import hash_password
from app.db.prisma_client import get_db
from app.db.prisma_json import to_prisma_json
from app.schemas.common import UserCreate, UserResponse, UserUpdate
from app.schemas.serializers import serialize_user

router = APIRouter()


async def _validate_center(db: Prisma, center_id: str | None, *, required: bool = False) -> None:
    if not center_id:
        if required:
            raise HTTPException(status_code=400, detail="center_id is required")
        return
    center = await db.center.find_first(where={"id": center_id, "deletedAt": None})
    if not center:
        raise HTTPException(status_code=400, detail="Center not found")


@router.get("/admins")
async def list_admins(
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN)),
):
    admins = await db.user.find_many(
        where={"role": Role.ADMIN, "deletedAt": None},
        order={"createdAt": "desc"},
    )
    return [serialize_user(a) for a in admins]


@router.post("/admins", response_model=UserResponse)
async def create_admin(
    payload: UserCreate,
    request: Request,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN)),
):
    existing = await db.user.find_first(where={"email": payload.email, "deletedAt": None})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    await _validate_center(db, payload.center_id, required=True)

    admin = await db.user.create(
        data={
            "email": payload.email,
            "passwordHash": hash_password(payload.password),
            "firstName": payload.first_name,
            "lastName": payload.last_name,
            "role": Role.ADMIN,
            "centerId": payload.center_id,
            "permissions": payload.permissions,
        }
    )
    await emit_audit(db, actor_id=user.id, action="ADMIN_CREATED", entity_type="User", entity_id=admin.id, after=serialize_user(admin), ip_address=get_client_ip(request))
    return UserResponse(**serialize_user(admin))


@router.get("/agents")
async def list_agents(
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.ADMIN, Role.MASTER_ADMIN)),
):
    where = {"role": Role.AGENT, "deletedAt": None}
    if user.role == Role.ADMIN:
        where["centerId"] = user.centerId
    agents = await db.user.find_many(where=where, order={"createdAt": "desc"})
    return [serialize_user(a) for a in agents]


@router.post("/agents", response_model=UserResponse)
async def create_agent(
    payload: UserCreate,
    request: Request,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.ADMIN, Role.MASTER_ADMIN)),
):
    center_id = payload.center_id or user.centerId
    if user.role == Role.ADMIN and center_id != user.centerId:
        raise HTTPException(status_code=403, detail="Cannot create agent outside your center")

    await _validate_center(db, center_id, required=True)

    existing = await db.user.find_first(where={"email": payload.email, "deletedAt": None})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    agent = await db.user.create(
        data={
            "email": payload.email,
            "passwordHash": hash_password(payload.password),
            "firstName": payload.first_name,
            "lastName": payload.last_name,
            "role": Role.AGENT,
            "centerId": center_id,
            "permissions": to_prisma_json(payload.permissions or {}),
        }
    )
    await emit_audit(db, actor_id=user.id, action="AGENT_CREATED", entity_type="User", entity_id=agent.id, after=serialize_user(agent), ip_address=get_client_ip(request))
    return UserResponse(**serialize_user(agent))


@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    payload: UserUpdate,
    request: Request,
    db: Prisma = Depends(get_db),
    current=Depends(get_current_user),
):
    target = await db.user.find_first(where={"id": user_id, "deletedAt": None})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if current.role == Role.ADMIN and (target.role != Role.AGENT or target.centerId != current.centerId):
        raise HTTPException(status_code=403, detail="Cannot update this user")
    if current.role == Role.AGENT:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if current.role not in (Role.MASTER_ADMIN, Role.ADMIN):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    data = {}
    if payload.email:
        data["email"] = payload.email
    if payload.first_name:
        data["firstName"] = payload.first_name
    if payload.last_name:
        data["lastName"] = payload.last_name
    if payload.center_id is not None:
        await _validate_center(db, payload.center_id, required=bool(payload.center_id))
        data["centerId"] = payload.center_id
    if payload.is_active is not None:
        data["isActive"] = payload.is_active
    if payload.permissions is not None:
        data["permissions"] = to_prisma_json(payload.permissions)
    if payload.password:
        data["passwordHash"] = hash_password(payload.password)

    updated = await db.user.update(where={"id": user_id}, data=data)
    await emit_audit(db, actor_id=current.id, action="USER_UPDATED", entity_type="User", entity_id=user_id, after=serialize_user(updated), ip_address=get_client_ip(request))
    return serialize_user(updated)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    db: Prisma = Depends(get_db),
    current=Depends(get_current_user),
):
    target = await db.user.find_first(where={"id": user_id, "deletedAt": None})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if current.role == Role.ADMIN and (target.role != Role.AGENT or target.centerId != current.centerId):
        raise HTTPException(status_code=403, detail="Cannot delete this user")
    if current.role not in (Role.MASTER_ADMIN, Role.ADMIN):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    snapshot = serialize_user(target)
    await db.user.update(where={"id": user_id}, data={"deletedAt": datetime.now(timezone.utc), "isActive": False})
    await db.trashrecord.create(
        data={
            "entityType": TrashEntityType.USER,
            "entityId": user_id,
            "snapshot": snapshot,
            "deletedById": current.id,
        }
    )
    await emit_audit(db, actor_id=current.id, action="USER_DELETED", entity_type="User", entity_id=user_id, before=snapshot, ip_address=get_client_ip(request))
    return {"message": "User moved to trash"}
