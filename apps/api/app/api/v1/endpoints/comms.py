from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from prisma import Prisma
from prisma.enums import Role

from app.core.deps import get_client_ip, get_current_user, get_lead_scoped
from app.core.permissions import require_roles
from app.db.prisma_client import get_db
from app.modules.comms.service import get_lead_timeline, send_email, send_sms
from app.schemas.common import EmailSendRequest, ScheduledMessageCreate, SmsSendRequest, TemplateCreate, TemplateResponse

router = APIRouter()


@router.post("/sms")
async def send_sms_message(
    payload: SmsSendRequest,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN, Role.AGENT)),
):
    lead = await get_lead_scoped(payload.lead_id, user, db)
    return await send_sms(db, lead=lead, body=payload.body)


@router.post("/email")
async def send_email_message(
    payload: EmailSendRequest,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN, Role.AGENT)),
):
    lead = await get_lead_scoped(payload.lead_id, user, db)
    return await send_email(db, lead=lead, subject=payload.subject, body=payload.body)


@router.get("/leads/{lead_id}/timeline")
async def lead_timeline(lead_id: str, db: Prisma = Depends(get_db), user=Depends(get_current_user)):
    await get_lead_scoped(lead_id, user, db)
    items = await get_lead_timeline(db, lead_id)
    return [
        {
            "id": i["id"],
            "channel": i["channel"],
            "direction": i["direction"],
            "title": i["title"],
            "body": i["body"],
            "status": i["status"],
            "created_at": i["created_at"],
        }
        for i in items
    ]


@router.get("/templates")
async def list_templates(db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN))):
    where = {}
    if user.role == Role.ADMIN:
        where["centerId"] = user.centerId
    templates = await db.messagetemplate.find_many(where=where)
    return [
        {
            "id": t.id,
            "channel": t.channel,
            "name": t.name,
            "subject": t.subject,
            "body": t.body,
            "center_id": t.centerId,
        }
        for t in templates
    ]


@router.post("/templates", response_model=TemplateResponse)
async def create_template(
    payload: TemplateCreate,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN)),
):
    template = await db.messagetemplate.create(
        data={
            "channel": payload.channel,
            "name": payload.name,
            "subject": payload.subject,
            "body": payload.body,
            "centerId": payload.center_id or user.centerId,
            "createdBy": user.id,
        }
    )
    return TemplateResponse(
        id=template.id,
        channel=template.channel,
        name=template.name,
        subject=template.subject,
        body=template.body,
        center_id=template.centerId,
    )


@router.post("/schedule")
async def schedule_message(
    payload: ScheduledMessageCreate,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN, Role.ADMIN, Role.AGENT)),
):
    await get_lead_scoped(payload.lead_id, user, db)
    scheduled = await db.scheduledmessage.create(
        data={
            "leadId": payload.lead_id,
            "channel": payload.channel,
            "subject": payload.subject,
            "body": payload.body,
            "scheduledAt": payload.scheduled_at,
            "createdBy": user.id,
        }
    )
    return {"id": scheduled.id, "status": scheduled.status, "scheduled_at": scheduled.scheduledAt}


@router.post("/webhooks/twilio/status")
async def twilio_status_webhook(request: Request, db: Prisma = Depends(get_db)):
    form = await request.form()
    sid = form.get("MessageSid") or form.get("CallSid")
    status_value = form.get("MessageStatus") or form.get("CallStatus")
    if sid:
        await db.smsmessage.update_many(where={"twilioSid": str(sid)}, data={"status": str(status_value)})
    return {"ok": True}
