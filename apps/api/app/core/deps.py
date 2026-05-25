from fastapi import Depends, HTTPException, Request, status
from prisma import Prisma
from prisma.enums import Role
from prisma.models import Lead, User

from app.core.security import decode_access_token
from app.db.prisma_client import get_db


async def get_current_user(request: Request, db: Prisma = Depends(get_db)) -> User:

    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = await db.user.find_first(where={"id": payload["sub"], "deletedAt": None})
    if not user or not user.isActive:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found")
    return user


async def get_lead_scoped(lead_id: str, user: User, db: Prisma) -> Lead:
    lead = await db.lead.find_first(where={"id": lead_id, "deletedAt": None})
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    if user.role == Role.MASTER_ADMIN:
        return lead
    if user.role == Role.ADMIN and lead.centerId == user.centerId and lead.assignedAdminId == user.id:
        return lead
    if user.role == Role.AGENT and lead.assignedAgentId == user.id:
        return lead

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Lead access denied")


def get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None
