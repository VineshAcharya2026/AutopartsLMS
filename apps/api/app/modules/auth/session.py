from datetime import datetime, timezone

from fastapi import HTTPException, Request, Response, status
from prisma import Prisma

from app.core.audit import emit_audit
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token_value,
    hash_token,
    refresh_token_expiry,
)
from app.schemas.common import TokenResponse, UserResponse
from app.schemas.serializers import serialize_user


async def issue_session_tokens(
    *,
    db: Prisma,
    user,
    response: Response,
    request: Request,
    audit_action: str = "USER_LOGIN",
    ip_address: str | None = None,
) -> TokenResponse:
    if not user.isActive or user.deletedAt:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    access_token = create_access_token({"sub": user.id, "role": user.role, "center_id": user.centerId})
    refresh_value = create_refresh_token_value()
    await db.refreshtoken.create(
        data={
            "userId": user.id,
            "tokenHash": hash_token(refresh_value),
            "expiresAt": refresh_token_expiry(),
        }
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_value,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax" if not settings.cookie_secure else "none",
        max_age=7 * 24 * 3600,
    )

    await emit_audit(
        db,
        actor_id=user.id,
        action=audit_action,
        entity_type="User",
        entity_id=user.id,
        ip_address=ip_address or "",
    )

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**serialize_user(user)),
    )


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
