import asyncio

from fastapi import HTTPException, status
from prisma import Prisma

_db: Prisma | None = None
CONNECT_TIMEOUT_SECONDS = 5


async def connect_db() -> Prisma:
    global _db
    if _db is None:
        client = Prisma()
        try:
            await asyncio.wait_for(client.connect(), timeout=CONNECT_TIMEOUT_SECONDS)
        except asyncio.TimeoutError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database unavailable. Start PostgreSQL, then run: cd packages/database && npx prisma migrate deploy && npx prisma db seed",
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database unavailable. Start PostgreSQL, then run: cd packages/database && npx prisma migrate deploy && npx prisma db seed",
            ) from exc
        _db = client
    return _db


async def disconnect_db() -> None:
    global _db
    if _db is not None:
        try:
            await _db.disconnect()
        except Exception:
            pass
        _db = None


async def get_db() -> Prisma:
    return await connect_db()
