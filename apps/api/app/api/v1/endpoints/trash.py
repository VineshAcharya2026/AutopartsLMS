from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from prisma.enums import Role

from app.core.permissions import require_roles
from app.db.prisma_client import get_db
from app.modules.trash.service import purge_trash_record, restore_trash_record
from app.schemas.common import TrashRecordResponse

router = APIRouter()


@router.get("")
async def list_trash(db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN))):
    records = await db.trashrecord.find_many(
        where={"restoredAt": None, "purgedAt": None},
        order={"createdAt": "desc"},
    )
    return [
        TrashRecordResponse(
            id=r.id,
            entity_type=r.entityType,
            entity_id=r.entityId,
            snapshot=r.snapshot or {},
            deleted_by_id=r.deletedById,
            restored_at=r.restoredAt,
            created_at=r.createdAt,
        )
        for r in records
    ]


@router.post("/{record_id}/restore")
async def restore_record(record_id: str, db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN))):
    record = await db.trashrecord.find_first(where={"id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    await restore_trash_record(db, record)
    return {"message": "Restored"}


@router.delete("/{record_id}/purge")
async def purge_record(record_id: str, db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN))):
    record = await db.trashrecord.find_first(where={"id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    await purge_trash_record(db, record)
    return {"message": "Permanently deleted"}
