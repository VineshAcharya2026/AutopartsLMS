from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from prisma import Prisma
from prisma.enums import Role

from app.core.audit import emit_audit
from app.core.config import settings
from app.core.deps import get_client_ip, get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token_value,
    hash_password,
    hash_token,
    refresh_token_expiry,
    verify_password,
)
from app.db.prisma_client import get_db
from app.schemas.common import LoginRequest, TokenResponse, UserResponse
from app.schemas.serializers import serialize_user

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, response: Response, db: Prisma = Depends(get_db)):
    user = await db.user.find_first(where={"email": payload.email, "deletedAt": None})
    if not user or not verify_password(payload.password, user.passwordHash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.isActive:
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
        action="USER_LOGIN",
        entity_type="User",
        entity_id=user.id,
        ip_address=get_client_ip(request),
    )

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**serialize_user(user)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response, db: Prisma = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    token_hash = hash_token(token)
    stored = await db.refreshtoken.find_first(
        where={"tokenHash": token_hash, "revokedAt": None},
        include={"user": True},
    )
    if not stored or stored.expiresAt.replace(tzinfo=None) < __import__("datetime").datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = stored.user
    if not user or not user.isActive or user.deletedAt:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")

    await db.refreshtoken.update(where={"id": stored.id}, data={"revokedAt": __import__("datetime").datetime.utcnow()})

    new_refresh = create_refresh_token_value()
    await db.refreshtoken.create(
        data={
            "userId": user.id,
            "tokenHash": hash_token(new_refresh),
            "expiresAt": refresh_token_expiry(),
        }
    )

    access_token = create_access_token({"sub": user.id, "role": user.role, "center_id": user.centerId})
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax" if not settings.cookie_secure else "none",
        max_age=7 * 24 * 3600,
    )

    return TokenResponse(access_token=access_token, user=UserResponse(**serialize_user(user)))


@router.post("/logout")
async def logout(request: Request, response: Response, db: Prisma = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if token:
        await db.refreshtoken.update_many(
            where={"tokenHash": hash_token(token)},
            data={"revokedAt": __import__("datetime").datetime.utcnow()},
        )
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def me(user=Depends(get_current_user)):
    return UserResponse(**serialize_user(user))
