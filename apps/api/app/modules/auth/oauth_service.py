import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import quote, urlencode

import httpx
from fastapi import HTTPException, status
from prisma import Prisma
from prisma.enums import OAuthProvider, Role

from app.core.config import settings
from app.core.encryption import encrypt_secret
from app.modules.auth.session import utcnow

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
OAUTH_STATE_TTL = timedelta(minutes=10)
LOGIN_CODE_TTL = timedelta(seconds=60)


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def google_oauth_configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret and settings.resolved_oauth_redirect_uri)


def _require_google_config() -> None:
    if not google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )


def _pkce_challenge(code_verifier: str) -> str:
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


async def _cleanup_expired_oauth_records(db: Prisma) -> None:
    now = utcnow()
    await db.oauthstate.delete_many(where={"expiresAt": {"lt": now}})
    await db.oauthlogincode.delete_many(where={"expiresAt": {"lt": now}})


async def start_google_oauth(db: Prisma, expected_role: Role) -> str:
    _require_google_config()
    await _cleanup_expired_oauth_records(db)

    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    expires_at = utcnow() + OAUTH_STATE_TTL

    await db.oauthstate.create(
        data={
            "state": state,
            "codeVerifier": code_verifier,
            "expectedRole": expected_role,
            "expiresAt": expires_at,
        }
    )

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.resolved_oauth_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": _pkce_challenge(code_verifier),
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def _frontend_error_redirect(message: str) -> str:
    base = settings.frontend_oauth_callback_url.rstrip("/")
    return f"{base}?error={quote(message)}"


async def handle_google_callback(db: Prisma, *, state: str, code: str) -> str:
    _require_google_config()
    await _cleanup_expired_oauth_records(db)

    stored = await db.oauthstate.find_unique(where={"state": state})
    if not stored or _as_utc(stored.expiresAt) < utcnow():
        return _frontend_error_redirect("OAuth session expired. Please try again.")

    await db.oauthstate.delete(where={"id": stored.id})

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "code": code,
                "redirect_uri": settings.resolved_oauth_redirect_uri,
                "grant_type": "authorization_code",
                "code_verifier": stored.codeVerifier,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code >= 400:
            return _frontend_error_redirect("Google sign-in failed during token exchange.")

        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return _frontend_error_redirect("Google did not return an access token.")

        profile_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if profile_res.status_code >= 400:
            return _frontend_error_redirect("Unable to load Google profile.")

        profile = profile_res.json()

    email = (profile.get("email") or "").strip().lower()
    google_sub = profile.get("sub")
    if not email or not google_sub:
        return _frontend_error_redirect("Google account is missing required profile fields.")
    if not profile.get("email_verified"):
        return _frontend_error_redirect("Google email address is not verified.")

    user = await db.user.find_first(
        where={
            "email": {"equals": email, "mode": "insensitive"},
            "deletedAt": None,
        }
    )
    if not user:
        return _frontend_error_redirect("No account found for this Google email. Contact your administrator.")
    if not user.isActive:
        return _frontend_error_redirect("Account is disabled.")
    if user.role != stored.expectedRole:
        return _frontend_error_redirect(
            f"This Google account is registered as {user.role.replace('_', ' ').title()}, not {stored.expectedRole.replace('_', ' ').title()}."
        )

    expires_at = None
    if token_data.get("expires_in"):
        expires_at = utcnow() + timedelta(seconds=int(token_data["expires_in"]))

    encrypted_access = encrypt_secret(access_token)
    encrypted_refresh = encrypt_secret(token_data["refresh_token"]) if token_data.get("refresh_token") else None

    existing = await db.oauthaccount.find_unique(
        where={
            "provider_providerAccountId": {
                "provider": OAuthProvider.GOOGLE,
                "providerAccountId": google_sub,
            }
        }
    )
    oauth_payload = {
        "userId": user.id,
        "email": email,
        "accessToken": encrypted_access,
        "refreshToken": encrypted_refresh,
        "expiresAt": expires_at,
    }
    if existing:
        await db.oauthaccount.update(where={"id": existing.id}, data=oauth_payload)
    else:
        await db.oauthaccount.create(
            data={
                **oauth_payload,
                "provider": OAuthProvider.GOOGLE,
                "providerAccountId": google_sub,
            }
        )

    login_code = secrets.token_urlsafe(32)
    await db.oauthlogincode.create(
        data={
            "code": login_code,
            "userId": user.id,
            "expiresAt": utcnow() + LOGIN_CODE_TTL,
        }
    )

    base = settings.frontend_oauth_callback_url.rstrip("/")
    return f"{base}?code={login_code}"


async def exchange_login_code(db: Prisma, code: str):
    await _cleanup_expired_oauth_records(db)
    record = await db.oauthlogincode.find_unique(where={"code": code})
    if not record or record.usedAt is not None or _as_utc(record.expiresAt) < utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired login code")

    user = await db.user.find_unique(where={"id": record.userId})
    if not user or user.deletedAt or not user.isActive:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account unavailable")

    await db.oauthlogincode.update(where={"id": record.id}, data={"usedAt": utcnow()})
    return user
