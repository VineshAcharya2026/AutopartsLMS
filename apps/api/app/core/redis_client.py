import json
from typing import Any

import redis.asyncio as redis

from app.core.config import settings

_redis: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def publish_event(channel: str, payload: dict[str, Any]) -> None:
    client = await get_redis()
    await client.publish(channel, json.dumps(payload))


async def publish_user_notification(user_id: str, payload: dict[str, Any]) -> None:
    await publish_event(f"notifications:{user_id}", payload)
