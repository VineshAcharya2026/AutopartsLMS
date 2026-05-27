import os
import uuid

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from prisma import Prisma
from prisma.enums import FollowUpStatus, LeadSource, LeadStatus, Role

from app.core.audit import emit_audit
from app.core.deps import get_client_ip, get_current_user, get_lead_scoped
from app.core.permissions import require_roles
from app.db.prisma_client import get_db
from app.db.prisma_json import to_prisma_json
from app.modules.ingestion.csv_import import import_leads_from_csv
from app.modules.leads.service import get_agent_wise_view, get_kanban_view, list_leads, soft_delete_lead
from app.modules.notifications.service import notify_lead_assignment
from app.schemas.common import (
    FollowUpCreate,
    FollowUpResponse,
    LeadAssignRequest,
    LeadCreate,
    LeadResponse,
    LeadUpdate,
    RemarkCreate,
    RemarkResponse,
)
from app.schemas.serializers import normalize_email, normalize_phone, serialize_lead

router = APIRouter()


@router.get("")
async def get_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    agent_id: str | None = None,
    search: str | None = None,
    unassigned: bool = False,
    db: Prisma = Depends(get_db),
    user=Depends(get_current_user),
):
    return await list_leads(
        db,
        user,
        page=page,
        page_size=page_size,
        status=status,
        agent_id=agent_id,
        search=search,
        unassigned=unassigned,
    )


@router.get("/views/kanban")
async def kanban_view(db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN))):
    return await get_kanban_view(db, user)


@router.get("/views/agent-wise")
async def agent_wise_view(db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN))):
    return await get_agent_wise_view(db, user)


@router.post("", response_model=LeadResponse)
async def create_lead(
    payload: LeadCreate,
    request: Request,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN, Role.AGENT)),
):
    center_id = payload.center_id or user.centerId
    if user.role == Role.ADMIN and center_id != user.centerId:
        raise HTTPException(status_code=403, detail="Cannot create lead outside your center")

    from app.modules.ingestion.service import ingest_lead

    result = await ingest_lead(
        db,
        payload={
            "name": payload.name,
            "phone": payload.phone,
            "email": payload.email,
            "course_interest": payload.course_interest,
            "city": payload.city,
            "message": payload.message,
            "metadata": payload.metadata,
            "tags": payload.tags,
        },
        source=LeadSource(payload.source),
        center_id=center_id,
        source_website=payload.source_website,
        campaign=payload.campaign,
    )
    lead_data = result["lead"]
    if payload.assigned_agent_id or payload.assigned_admin_id:
        lead = await db.lead.update(
            where={"id": lead_data["id"]},
            data={
                "assignedAgentId": payload.assigned_agent_id,
                "assignedAdminId": payload.assigned_admin_id or (user.id if user.role == Role.ADMIN else None),
            },
        )
        lead_data = serialize_lead(lead)

    await emit_audit(db, actor_id=user.id, action="LEAD_CREATED", entity_type="Lead", entity_id=lead_data["id"], after=lead_data, ip_address=get_client_ip(request))
    return LeadResponse(**lead_data)


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, db: Prisma = Depends(get_db), user=Depends(get_current_user)):
    lead = await get_lead_scoped(lead_id, user, db)
    return LeadResponse(**serialize_lead(lead))


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    payload: LeadUpdate,
    request: Request,
    db: Prisma = Depends(get_db),
    user=Depends(get_current_user),
):
    lead = await get_lead_scoped(lead_id, user, db)
    before = serialize_lead(lead)

    data = {}
    if payload.name is not None:
        data["name"] = payload.name
    if payload.phone is not None:
        data["phone"] = normalize_phone(payload.phone)
    if payload.email is not None:
        data["email"] = normalize_email(payload.email)
    if payload.status is not None:
        data["status"] = LeadStatus(payload.status)
    if payload.priority is not None:
        data["priority"] = payload.priority
    if payload.assigned_admin_id is not None and user.role in (Role.MASTER_ADMIN, Role.ADMIN):
        data["assignedAdminId"] = payload.assigned_admin_id
    if payload.assigned_agent_id is not None and user.role in (Role.MASTER_ADMIN, Role.ADMIN):
        data["assignedAgentId"] = payload.assigned_agent_id
    if payload.follow_up_at is not None:
        data["followUpAt"] = payload.follow_up_at
    if payload.course_interest is not None:
        data["courseInterest"] = payload.course_interest
    if payload.city is not None:
        data["city"] = payload.city
    if payload.message is not None:
        data["message"] = payload.message
    if payload.tags is not None:
        data["tags"] = payload.tags
    if payload.metadata is not None:
        data["metadata"] = to_prisma_json(payload.metadata)

    if payload.increment_attempt:
        data["attemptCount"] = lead.attemptCount + 1
        if payload.attempt_outcome == "UNREACHABLE" and lead.status == LeadStatus.UNATTEMPTED:
            data["status"] = LeadStatus.UNATTEMPTED

    updated = await db.lead.update(where={"id": lead_id}, data=data)
    await emit_audit(db, actor_id=user.id, action="LEAD_UPDATED", entity_type="Lead", entity_id=lead_id, before=before, after=serialize_lead(updated), ip_address=get_client_ip(request))
    return LeadResponse(**serialize_lead(updated))


@router.post("/{lead_id}/assign")
async def assign_lead(
    lead_id: str,
    payload: LeadAssignRequest,
    request: Request,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN)),
):
    lead = await get_lead_scoped(lead_id, user, db)
    update_data: dict = {}

    if user.role == Role.MASTER_ADMIN:
        center_id = payload.center_id or lead.centerId
        if payload.assigned_admin_id:
            if not center_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="center_id is required when assigning an admin",
                )
            admin = await db.user.find_first(
                where={
                    "id": payload.assigned_admin_id,
                    "role": Role.ADMIN,
                    "centerId": center_id,
                    "deletedAt": None,
                    "isActive": True,
                }
            )
            if not admin:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Admin not found in the selected center",
                )
            if lead.assignedAdminId != payload.assigned_admin_id:
                update_data["assignedAgentId"] = None
            update_data["assignedAdminId"] = payload.assigned_admin_id
            update_data["centerId"] = center_id
        elif payload.center_id:
            update_data["centerId"] = payload.center_id

    if payload.assigned_agent_id:
        agent_where: dict = {
            "id": payload.assigned_agent_id,
            "role": Role.AGENT,
            "deletedAt": None,
            "isActive": True,
        }
        if user.role == Role.ADMIN:
            agent_where["centerId"] = user.centerId
        agent = await db.user.find_first(where=agent_where)
        if not agent:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent not found")
        if user.role == Role.ADMIN and lead.assignedAdminId != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Lead not assigned to you")
        update_data["assignedAgentId"] = payload.assigned_agent_id
        if user.role == Role.ADMIN and not lead.assignedAdminId:
            update_data["assignedAdminId"] = user.id

    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No assignment changes provided")

    updated = await db.lead.update(where={"id": lead_id}, data=update_data)
    await notify_lead_assignment(db, updated, assigned_by=user.id)
    await emit_audit(
        db,
        actor_id=user.id,
        action="LEAD_ASSIGNED",
        entity_type="Lead",
        entity_id=lead_id,
        after=serialize_lead(updated),
        ip_address=get_client_ip(request),
    )
    return serialize_lead(updated)


@router.post("/{lead_id}/remarks", response_model=RemarkResponse)
async def add_remark(
    lead_id: str,
    payload: RemarkCreate,
    db: Prisma = Depends(get_db),
    user=Depends(get_current_user),
):
    await get_lead_scoped(lead_id, user, db)
    remark = await db.remark.create(data={"leadId": lead_id, "authorId": user.id, "body": payload.body})
    return RemarkResponse(
        id=remark.id,
        lead_id=remark.leadId,
        author_id=remark.authorId,
        body=remark.body,
        created_at=remark.createdAt,
    )


@router.get("/{lead_id}/remarks")
async def list_remarks(lead_id: str, db: Prisma = Depends(get_db), user=Depends(get_current_user)):
    await get_lead_scoped(lead_id, user, db)
    remarks = await db.remark.find_many(where={"leadId": lead_id, "deletedAt": None}, order={"createdAt": "desc"})
    return [
        {"id": r.id, "lead_id": r.leadId, "author_id": r.authorId, "body": r.body, "created_at": r.createdAt}
        for r in remarks
    ]


@router.post("/{lead_id}/follow-ups", response_model=FollowUpResponse)
async def create_follow_up(
    lead_id: str,
    payload: FollowUpCreate,
    db: Prisma = Depends(get_db),
    user=Depends(get_current_user),
):
    await get_lead_scoped(lead_id, user, db)
    agent_id = user.id if user.role == Role.AGENT else user.id
    follow_up = await db.followup.create(
        data={
            "leadId": lead_id,
            "agentId": agent_id,
            "scheduledAt": payload.scheduled_at,
            "notes": payload.notes,
            "status": FollowUpStatus.PENDING,
        }
    )
    await db.lead.update(where={"id": lead_id}, data={"followUpAt": payload.scheduled_at, "status": LeadStatus.FOLLOW_UP})
    return FollowUpResponse(
        id=follow_up.id,
        lead_id=follow_up.leadId,
        agent_id=follow_up.agentId,
        scheduled_at=follow_up.scheduledAt,
        completed_at=follow_up.completedAt,
        notes=follow_up.notes,
        status=follow_up.status,
        created_at=follow_up.createdAt,
    )


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    request: Request,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN)),
):
    lead = await get_lead_scoped(lead_id, user, db)
    await soft_delete_lead(db, lead=lead, user=user, ip_address=get_client_ip(request))
    return {"message": "Lead moved to trash"}


@router.post("/import/csv")
async def import_csv(
    content: str,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN)),
):
    center_id = user.centerId if user.role == Role.ADMIN else None
    return await import_leads_from_csv(db, content=content, center_id=center_id)


@router.post("/{lead_id}/attachments")
async def upload_attachment(
    lead_id: str,
    file: UploadFile = File(...),
    db: Prisma = Depends(get_db),
    user=Depends(get_current_user),
):
    lead = await get_lead_scoped(lead_id, user, db)
    from app.core.config import settings

    os.makedirs(settings.storage_path, exist_ok=True)
    ext = os.path.splitext(file.filename or "file")[1]
    file_key = f"{lead_id}/{uuid.uuid4()}{ext}"
    path = os.path.join(settings.storage_path, file_key)
    os.makedirs(os.path.dirname(path), exist_ok=True)

    content = await file.read()
    if len(content) > settings.upload_max_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")

    async with aiofiles.open(path, "wb") as f:
        await f.write(content)

    attachment = await db.attachment.create(
        data={
            "leadId": lead.id,
            "uploadedById": user.id,
            "fileName": file.filename or "file",
            "fileKey": file_key,
            "mimeType": file.content_type or "application/octet-stream",
            "sizeBytes": len(content),
        }
    )
    return {
        "id": attachment.id,
        "file_name": attachment.fileName,
        "file_key": attachment.fileKey,
        "mime_type": attachment.mimeType,
        "size_bytes": attachment.sizeBytes,
    }
