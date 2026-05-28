"""Seed database: 5 centers, 5 admins, 5 agents, 10 interlinked leads."""

import asyncio
from datetime import datetime, timezone

import bcrypt
from prisma import Json, Prisma

CENTERS = [
    ("HQ", "Headquarters"),
    ("NORTH", "North Region"),
    ("SOUTH", "South Region"),
    ("EAST", "East Region"),
    ("WEST", "West Region"),
]

AUTO_PARTS_META = [
    {"year": "2018", "make": "Toyota", "model": "Camry", "part_name": "Engine", "vin": "1HGCM82633A004352", "zip_code": "90210", "purchase_timeline": "Immediately", "comment": "Need OEM preferred"},
    {"year": "2015", "make": "Honda", "model": "Civic", "part_name": "Transmission", "vin": "2HGFB2F59FH543210", "zip_code": "10001", "purchase_timeline": "Within 2 weeks", "comment": "Used acceptable"},
    {"year": "2020", "make": "Ford", "model": "F-150", "part_name": "Alternator", "vin": "1FTFW1E50LFA12345", "zip_code": "33101", "purchase_timeline": "This month", "comment": "Fleet order"},
    {"year": "2012", "make": "BMW", "model": "328i", "part_name": "Headlight", "vin": "WBA3B1C50EK123456", "zip_code": "60601", "purchase_timeline": "Immediately", "comment": "Left side only"},
    {"year": "2019", "make": "Chevrolet", "model": "Malibu", "part_name": "Brake pads", "vin": "1G1ZD5ST0KF123789", "zip_code": "75201", "purchase_timeline": "Within 2 weeks", "comment": "Front set"},
]

LEAD_SPECS = [
    ("seed-lead-01", "Rahul Sharma", "+919876543210", "rahul@example.com", "HQ", "NEW", False),
    ("seed-lead-02", "Priya Patel", "+919876543211", "priya@example.com", "NORTH", "ATTEMPTED", False),
    ("seed-lead-03", "Amit Kumar", "+919876543212", "amit@example.com", "SOUTH", "FOLLOW_UP", False),
    ("seed-lead-04", "Sneha Reddy", "+919876543213", "sneha@example.com", "EAST", "INTERESTED", False),
    ("seed-lead-05", "Vikram Singh", "+919876543214", "vikram@example.com", "WEST", "CALLBACK", False),
    ("seed-auto-parts-1", "John Doe", "5551234567", "john@example.com", "HQ", "NEW", True),
    ("seed-auto-parts-2", "Jane Smith", "5559876543", "jane@example.com", "NORTH", "ATTEMPTED", True),
    ("seed-auto-parts-3", "Mike Johnson", "5554443322", "mike@example.com", "SOUTH", "FOLLOW_UP", True),
    ("seed-auto-parts-4", "Sarah Lee", "5551112233", "sarah@example.com", "EAST", "INTERESTED", True),
    ("seed-auto-parts-5", "Tom Brown", "5557778899", "tom@example.com", "WEST", "UNATTEMPTED", True),
]

# Legacy login emails kept for demo UI
LEGACY_AGENT_EMAIL = "agent@centercrm.com"
LEGACY_ADMIN_EMAIL = "admin@centercrm.com"


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def agent_email(code: str) -> str:
    if code == "HQ":
        return LEGACY_AGENT_EMAIL
    return f"agent.{code.lower()}@centercrm.com"


def agent_id(code: str) -> str:
    # HQ keeps legacy id so agent@centercrm.com login still works
    if code == "HQ":
        return "seed-agent"
    return f"seed-agent-{code.lower()}"


async def main() -> None:
    db = Prisma()
    await db.connect()

    password_hash = hash_password("Admin@123")
    center_by_code: dict[str, object] = {}
    admin_by_center: dict[str, object] = {}
    agent_by_center: dict[str, object] = {}

    await db.user.upsert(
        where={"id": "seed-master-admin"},
        data={
            "create": {
                "id": "seed-master-admin",
                "email": "master@centercrm.com",
                "passwordHash": password_hash,
                "firstName": "Master",
                "lastName": "Admin",
                "role": "MASTER_ADMIN",
                "isActive": True,
                "permissions": Json({"all": True}),
            },
            "update": {"passwordHash": password_hash, "isActive": True},
        },
    )

    for code, name in CENTERS:
        center = await db.center.upsert(
            where={"code": code},
            data={
                "create": {
                    "name": name,
                    "code": code,
                    "settings": Json({"maxAttempts": 5, "timezone": "Asia/Kolkata"}),
                },
                "update": {"name": name},
            },
        )
        center_by_code[code] = center

        admin_email = LEGACY_ADMIN_EMAIL if code == "HQ" else f"admin.{code.lower()}@centercrm.com"
        admin_seed_id = "seed-admin" if code == "HQ" else f"seed-admin-{code.lower()}"

        admin = await db.user.upsert(
            where={"id": admin_seed_id},
            data={
                "create": {
                    "id": admin_seed_id,
                    "email": admin_email,
                    "passwordHash": password_hash,
                    "firstName": name.split()[0],
                    "lastName": "Admin",
                    "role": "ADMIN",
                    "centerId": center.id,
                    "isActive": True,
                },
                "update": {
                    "centerId": center.id,
                    "passwordHash": password_hash,
                    "isActive": True,
                },
            },
        )
        admin_by_center[code] = admin

        agent = await db.user.upsert(
            where={"id": agent_id(code)},
            data={
                "create": {
                    "id": agent_id(code),
                    "email": agent_email(code),
                    "passwordHash": password_hash,
                    "firstName": "Sales",
                    "lastName": f"{code.title()} Agent",
                    "role": "AGENT",
                    "centerId": center.id,
                    "isActive": True,
                },
                "update": {
                    "centerId": center.id,
                    "passwordHash": password_hash,
                    "isActive": True,
                },
            },
        )
        agent_by_center[code] = agent

    created_leads = []
    for idx, (lead_id, name, phone, email, center_code, status, is_auto) in enumerate(LEAD_SPECS):
        center = center_by_code[center_code]
        admin = admin_by_center[center_code]
        agent = agent_by_center[center_code]
        meta = AUTO_PARTS_META[idx % len(AUTO_PARTS_META)] if is_auto else {}

        base = {
            "name": name,
            "phone": phone,
            "email": email,
            "source": "WEBSITE_FORM",
            "status": status,
            "centerId": center.id,
            "assignedAdminId": admin.id,
            "assignedAgentId": agent.id,
            "attemptCount": 1 if status in ("ATTEMPTED", "FOLLOW_UP", "INTERESTED", "CALLBACK") else 0,
            "city": meta.get("zip_code", "Mumbai") if not is_auto else meta.get("zip_code"),
            "sourceWebsite": "used-carparts.us" if is_auto else "centercrm.demo",
            "deletedAt": None,
        }
        if is_auto:
            base["courseInterest"] = meta.get("part_name")
            base["message"] = f"Purchase: {meta.get('purchase_timeline')} | {meta.get('comment', '')}"
            base["metadata"] = Json(meta)
        else:
            base["courseInterest"] = "Auto Parts Management"

        existing = await db.lead.find_first(where={"id": lead_id})
        if existing:
            lead = await db.lead.update(where={"id": lead_id}, data=base)
        else:
            lead = await db.lead.create(data={"id": lead_id, **base})
        created_leads.append(lead)

    remark_samples = [
        ("Initial outreach - left voicemail", "HQ"),
        ("Customer asked for quote via email", "NORTH"),
        ("Scheduled callback for tomorrow 10am", "SOUTH"),
        ("Sent parts catalog PDF", "EAST"),
        ("Price match requested - pending approval", "WEST"),
    ]
    for i, lead in enumerate(created_leads[:5]):
        body, center_code = remark_samples[i]
        author_id = agent_id(center_code)
        exists = await db.remark.find_first(where={"leadId": lead.id, "body": body})
        if not exists:
            await db.remark.create(data={"leadId": lead.id, "authorId": author_id, "body": body})

    for i, lead in enumerate(created_leads[:3]):
        exists = await db.calllog.find_first(where={"leadId": lead.id})
        if not exists:
            await db.calllog.create(
                data={
                    "leadId": lead.id,
                    "direction": "OUTBOUND",
                    "duration": 120 + i * 30,
                    "outcome": "Reached - discussed requirements",
                }
            )

    legacy_lead_ids = ["seed-lead-1"]
    for legacy_id in legacy_lead_ids:
        old = await db.lead.find_first(where={"id": legacy_id, "deletedAt": None})
        if old:
            await db.lead.update(
                where={"id": legacy_id},
                data={"deletedAt": datetime.now(timezone.utc)},
            )

    valid_agent_ids = {agent_id(code) for code, _ in CENTERS}
    extra_agents = await db.user.find_many(
        where={
            "role": "AGENT",
            "id": {"not_in": list(valid_agent_ids)},
            "email": {"contains": "@centercrm.com"},
        }
    )
    for user in extra_agents:
        if user.id.startswith("seed-agent"):
            await db.user.update(where={"id": user.id}, data={"isActive": False})

    center_count = await db.center.count()
    agent_count = await db.user.count(where={"role": "AGENT", "deletedAt": None})
    lead_count = await db.lead.count(where={"deletedAt": None})

    await db.disconnect()
    print(
        f"Seed complete: {center_count} centers, {agent_count} agents, {lead_count} leads "
        "(target: 5 centers, 5 agents, 10 leads)."
    )


if __name__ == "__main__":
    asyncio.run(main())
