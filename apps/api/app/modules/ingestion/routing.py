from prisma import Prisma
from prisma.enums import LeadStatus


async def apply_routing_rules(db: Prisma, lead):
    rule_where: dict = {"isActive": True}
    if lead.centerId:
        rule_where["centerId"] = lead.centerId

    rules = await db.leadroutingrule.find_many(
        where=rule_where,
        order={"priority": "desc"},
    )

    for rule in rules:
        conditions = rule.conditions or {}
        if not _matches_conditions(lead, conditions):
            continue

        update_data = {"status": LeadStatus.UNATTEMPTED}
        if rule.assignAdminId:
            update_data["assignedAdminId"] = rule.assignAdminId
        if rule.assignAgentId:
            update_data["assignedAgentId"] = rule.assignAgentId
        if rule.centerId and not lead.centerId:
            update_data["centerId"] = rule.centerId

        return await db.lead.update(where={"id": lead.id}, data=update_data)

    if lead.centerId and lead.status == LeadStatus.NEW:
        return await db.lead.update(where={"id": lead.id}, data={"status": LeadStatus.UNATTEMPTED})

    return lead


def _matches_conditions(lead, conditions: dict) -> bool:
    if not conditions:
        return True

    if "source" in conditions and lead.source != conditions["source"]:
        return False
    if "city" in conditions and (lead.city or "").lower() != conditions["city"].lower():
        return False
    if "campaign" in conditions and lead.campaign != conditions["campaign"]:
        return False
    if "source_website" in conditions and lead.sourceWebsite != conditions["source_website"]:
        return False

    return True
