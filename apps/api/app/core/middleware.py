import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.redis_client import get_redis


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.local_counts: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/v1/ingest") or request.url.path.startswith("/api/v1/auth/login"):
            client_ip = request.client.host if request.client else "unknown"
            key = f"ratelimit:{client_ip}:{request.url.path}"
            now = time.time()

            try:
                redis = await get_redis()
                count = await redis.incr(key)
                if count == 1:
                    await redis.expire(key, 60)
                if count > self.requests_per_minute:
                    return Response(content='{"detail":"Rate limit exceeded"}', status_code=429, media_type="application/json")
            except Exception:
                timestamps = self.local_counts[key]
                timestamps[:] = [t for t in timestamps if now - t < 60]
                timestamps.append(now)
                if len(timestamps) > self.requests_per_minute:
                    return Response(content='{"detail":"Rate limit exceeded"}', status_code=429, media_type="application/json")

        return await call_next(request)
