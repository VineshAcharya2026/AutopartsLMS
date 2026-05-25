from fastapi import APIRouter, Depends
from prisma import Prisma
from prisma.enums import Role

from app.core.permissions import require_roles
from app.db.prisma_client import get_db
from app.schemas.common import RoutingRuleCreate, RoutingRuleResponse

router = APIRouter()


@router.get("")
async def list_rules(db: Prisma = Depends(get_db), user=Depends(require_roles(Role.MASTER_ADMIN))):
    rules = await db.leadroutingrule.find_many(order={"priority": "desc"})
    return [
        {
            "id": r.id,
            "name": r.name,
            "center_id": r.centerId,
            "priority": r.priority,
            "conditions": r.conditions,
            "assign_admin_id": r.assignAdminId,
            "assign_agent_id": r.assignAgentId,
            "is_active": r.isActive,
        }
        for r in rules
    ]


@router.post("", response_model=RoutingRuleResponse)
async def create_rule(
    payload: RoutingRuleCreate,
    db: Prisma = Depends(get_db),
    user=Depends(require_roles(Role.MASTER_ADMIN)),
):
    rule = await db.leadroutingrule.create(
        data={
            "name": payload.name,
            "centerId": payload.center_id,
            "priority": payload.priority,
            "conditions": payload.conditions,
            "assignAdminId": payload.assign_admin_id,
            "assignAgentId": payload.assign_agent_id,
            "isActive": payload.is_active,
        }
    )
    return RoutingRuleResponse(
        id=rule.id,
        name=rule.name,
        center_id=rule.centerId,
        priority=rule.priority,
        conditions=rule.conditions or {},
        assign_admin_id=rule.assignAdminId,
        assign_agent_id=rule.assignAgentId,
        is_active=rule.isActive,
    )
