import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from prisma import Prisma
from prisma.enums import IntegrationType, LeadSource

from app.db.prisma_client import get_db
from app.modules.ingestion.service import ingest_lead
from app.schemas.common import IngestLeadPayload

router = APIRouter()


async def verify_integration_key(
    integration_id: str,
    x_api_key: str | None,
    db: Prisma,
):
    integration = await db.integration.find_first(
        where={"id": integration_id, "isActive": True}
    )
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    if integration.apiKey and integration.apiKey != x_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return integration


@router.post("/forms/{integration_id}")
async def ingest_form(
    integration_id: str,
    payload: IngestLeadPayload,
    x_api_key: str | None = Header(default=None),
    db: Prisma = Depends(get_db),
):
    integration = await verify_integration_key(integration_id, x_api_key, db)
    if integration.type != IntegrationType.FORM:
        raise HTTPException(status_code=400, detail="Invalid integration type")

    result = await ingest_lead(
        db,
        payload=payload.model_dump(),
        source=LeadSource.WEBSITE_FORM,
        center_id=integration.centerId,
        source_website=payload.source_website or (integration.config or {}).get("website"),
    )
    return result


@router.post("/landing/{integration_id}")
async def ingest_landing(
    integration_id: str,
    payload: IngestLeadPayload,
    x_api_key: str | None = Header(default=None),
    db: Prisma = Depends(get_db),
):
    integration = await verify_integration_key(integration_id, x_api_key, db)
    if integration.type != IntegrationType.LANDING:
        raise HTTPException(status_code=400, detail="Invalid integration type")

    result = await ingest_lead(
        db,
        payload=payload.model_dump(),
        source=LeadSource.LANDING_PAGE,
        center_id=integration.centerId,
        campaign=payload.campaign or (integration.config or {}).get("campaign"),
    )
    return result


@router.post("/webhook/{integration_id}")
async def ingest_webhook(
    integration_id: str,
    payload: IngestLeadPayload,
    x_api_key: str | None = Header(default=None),
    db: Prisma = Depends(get_db),
):
    integration = await verify_integration_key(integration_id, x_api_key, db)

    result = await ingest_lead(
        db,
        payload=payload.model_dump(),
        source=LeadSource.WEBHOOK,
        center_id=integration.centerId,
    )
    return result
