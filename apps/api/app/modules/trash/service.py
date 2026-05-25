from datetime import datetime, timezone

from prisma import Prisma


async def restore_trash_record(db: Prisma, record) -> None:
    snapshot = record.snapshot or {}
    entity_type = record.entityType

    if entity_type == "LEAD":
        await db.lead.update(
            where={"id": record.entityId},
            data={"deletedAt": None},
        )
    elif entity_type == "USER":
        await db.user.update(
            where={"id": record.entityId},
            data={"deletedAt": None},
        )
    elif entity_type == "CENTER":
        await db.center.update(
            where={"id": record.entityId},
            data={"deletedAt": None},
        )
    elif entity_type == "REMARK":
        await db.remark.update(
            where={"id": record.entityId},
            data={"deletedAt": None},
        )

    await db.trashrecord.update(
        where={"id": record.id},
        data={"restoredAt": datetime.now(timezone.utc)},
    )


async def purge_trash_record(db: Prisma, record) -> None:
    entity_type = record.entityType
    entity_id = record.entityId

    if entity_type == "LEAD":
        await db.lead.delete(where={"id": entity_id})
    elif entity_type == "USER":
        await db.user.delete(where={"id": entity_id})
    elif entity_type == "CENTER":
        await db.center.delete(where={"id": entity_id})
    elif entity_type == "REMARK":
        await db.remark.delete(where={"id": entity_id})

    await db.trashrecord.update(
        where={"id": record.id},
        data={"purgedAt": datetime.now(timezone.utc)},
    )
