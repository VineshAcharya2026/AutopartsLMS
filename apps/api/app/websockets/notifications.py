import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.redis_client import get_redis
from app.core.security import decode_access_token
from app.db.prisma_client import get_db

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active:
            self.active[user_id].discard(websocket)
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: str, message: dict):
        for ws in self.active.get(user_id, set()):
            await ws.send_json(message)


manager = ConnectionManager()


@router.websocket("/notifications")
async def websocket_notifications(websocket: WebSocket, token: str | None = None):
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = decode_access_token(token)
        user_id = payload["sub"]
    except ValueError:
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)
    redis = await get_redis()
    pubsub = redis.pubsub()
    channel = f"notifications:{user_id}"
    await pubsub.subscribe(channel)

    async def redis_listener():
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("data"):
                data = json.loads(message["data"])
                await websocket.send_json({"type": "notification", "data": data})
            await asyncio.sleep(0.1)

    listener_task = asyncio.create_task(redis_listener())

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        listener_task.cancel()
        await pubsub.unsubscribe(channel)
        await pubsub.close()
