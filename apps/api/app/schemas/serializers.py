import re
from typing import Any

from prisma.models import User


def serialize_user(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.firstName,
        "last_name": user.lastName,
        "role": str(user.role),
        "center_id": user.centerId,
        "is_active": user.isActive,
        "permissions": user.permissions or {},
        "created_at": user.createdAt,
    }


def serialize_lead(lead) -> dict[str, Any]:
    return {
        "id": lead.id,
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "source": lead.source,
        "status": lead.status,
        "priority": lead.priority,
        "attempt_count": lead.attemptCount,
        "inquiry_count": lead.inquiryCount,
        "center_id": lead.centerId,
        "assigned_admin_id": lead.assignedAdminId,
        "assigned_agent_id": lead.assignedAgentId,
        "follow_up_at": lead.followUpAt,
        "course_interest": lead.courseInterest,
        "city": lead.city,
        "message": lead.message,
        "source_website": lead.sourceWebsite,
        "campaign": lead.campaign,
        "tags": lead.tags or [],
        "metadata": lead.metadata or {},
        "created_at": lead.createdAt,
        "updated_at": lead.updatedAt,
    }


def serialize_center(center) -> dict[str, Any]:
    return {
        "id": center.id,
        "name": center.name,
        "code": center.code,
        "settings": center.settings or {},
        "created_at": center.createdAt,
    }


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if not digits:
        return None
    if len(digits) == 10:
        return f"+91{digits}"
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if phone.startswith("+"):
        return phone
    return f"+{digits}"


def normalize_email(email: str | None) -> str | None:
    return email.lower().strip() if email else None
