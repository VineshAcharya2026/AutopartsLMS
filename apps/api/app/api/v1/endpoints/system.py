import importlib.util
import sys
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from app.core.permissions import require_roles
from app.db.prisma_client import get_db
from prisma.enums import Role

router = APIRouter()


def _seed_file() -> Path:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "packages" / "database" / "seed.py"
        if candidate.is_file():
            return candidate
    raise HTTPException(status_code=500, detail="seed.py not found on server")


@router.post("/reseed-demo")
async def reseed_demo(
    _user=Depends(require_roles(Role.MASTER_ADMIN)),
    db: Prisma = Depends(get_db),
):
    """Re-run demo seed (5 centers, 5 agents, 10 leads). Master admin only."""
    seed_file = _seed_file()
    seed_dir = str(seed_file.parent)
    if seed_dir not in sys.path:
        sys.path.insert(0, seed_dir)

    try:
        spec = importlib.util.spec_from_file_location("demo_seed", seed_file)
        if spec is None or spec.loader is None:
            raise HTTPException(status_code=500, detail="Could not load seed module")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        await module.main()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Seed failed: {exc}") from exc

    center_count = await db.center.count()
    agent_count = await db.user.count(where={"role": Role.AGENT, "isActive": True, "deletedAt": None})
    lead_count = await db.lead.count(where={"deletedAt": None})

    return {
        "message": "Demo seed completed",
        "centers": center_count,
        "active_agents": agent_count,
        "leads": lead_count,
    }
