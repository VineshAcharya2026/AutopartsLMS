from fastapi import APIRouter, Depends
from prisma import Prisma
from prisma.enums import Role

from app.core.permissions import require_roles
from app.db.prisma_client import get_db
from app.schemas.common import AuditLogResponse

router = APIRouter()


@router.get("")
async def list_audit_logs(db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN))):
    logs = await db.auditlog.find_many(order={"createdAt": "desc"}, take=200)
    return [
        AuditLogResponse(
            id=log.id,
            actor_id=log.actorId,
            action=log.action,
            entity_type=log.entityType,
            entity_id=log.entityId,
            before=log.before,
            after=log.after,
            ip_address=log.ipAddress,
            created_at=log.createdAt,
        )
        for log in logs
    ]
