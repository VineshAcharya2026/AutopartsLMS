from fastapi import APIRouter, Depends
from prisma import Prisma

from app.core.deps import get_current_user
from app.db.prisma_client import get_db
from app.modules.analytics.service import get_dashboard_stats
from app.schemas.common import DashboardStats

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(db: Prisma = Depends(get_db), user=Depends(get_current_user)):
    stats = await get_dashboard_stats(db, user)
    return DashboardStats(**stats)
