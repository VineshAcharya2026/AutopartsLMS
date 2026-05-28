from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    audit,
    auth,
    centers,
    comms,
    ingest,
    integrations,
    leads,
    notifications,
    routing,
    system,
    trash,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(centers.router, prefix="/centers", tags=["centers"])
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
api_router.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(routing.router, prefix="/routing-rules", tags=["routing"])
api_router.include_router(comms.router, prefix="/comms", tags=["comms"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(trash.router, prefix="/trash", tags=["trash"])
api_router.include_router(audit.router, prefix="/audit-logs", tags=["audit"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
