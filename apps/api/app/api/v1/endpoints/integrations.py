import secrets

from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma
from prisma.enums import Role

from app.core.permissions import require_roles
from app.db.prisma_client import get_db
from app.db.prisma_json import to_prisma_json
from app.integrations.email.service import poll_integration
from app.schemas.common import IntegrationCreate, IntegrationResponse

router = APIRouter()


@router.get("")
async def list_integrations(db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN))):
    items = await db.integration.find_many(order={"createdAt": "desc"})
    return [
        {
            "id": i.id,
            "name": i.name,
            "type": i.type,
            "center_id": i.centerId,
            "api_key": i.apiKey,
            "is_active": i.isActive,
            "config": i.config,
            "created_at": i.createdAt,
        }
        for i in items
    ]


@router.post("", response_model=IntegrationResponse)
async def create_integration(
    payload: IntegrationCreate,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN)),
):
    api_key = secrets.token_urlsafe(32)
    integration = await db.integration.create(
        data={
            "name": payload.name,
            "type": payload.type,
            "centerId": payload.center_id,
            "config": to_prisma_json(payload.config or {}),
            "apiKey": api_key,
            "isActive": payload.is_active,
        }
    )
    return IntegrationResponse(
        id=integration.id,
        name=integration.name,
        type=integration.type,
        center_id=integration.centerId,
        api_key=integration.apiKey,
        is_active=integration.isActive,
        created_at=integration.createdAt,
    )


@router.post("/email/{integration_id}/sync")
async def sync_email_integration(
    integration_id: str,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN)),
):
    integration = await db.integration.find_first(where={"id": integration_id})
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    count = await poll_integration(db, integration)
    return {"processed": count}


@router.get("/email/failed-queue")
async def failed_email_queue(db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN))):
    items = await db.incomingemail.find_many(
        where={"parseStatus": "FAILED"},
        order={"createdAt": "desc"},
        take=100,
    )
    return [
        {
            "id": i.id,
            "integration_id": i.integrationId,
            "parse_error": i.parseError,
            "raw_content": i.rawContent[:500],
            "created_at": i.createdAt,
        }
        for i in items
    ]
