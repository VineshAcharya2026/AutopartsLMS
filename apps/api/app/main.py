from app.core.config import settings  # noqa: F401 — sets DATABASE_URL before Prisma loads

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.middleware import RateLimitMiddleware
from app.db.prisma_client import disconnect_db
from app.websockets.notifications import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await disconnect_db()


app = FastAPI(
    title="CenterCRM API",
    version="1.0.0",
    docs_url="/api/v1/docs",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/ws")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "centercrm-api"}
