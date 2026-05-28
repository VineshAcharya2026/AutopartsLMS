"""Seed database with default users, demo centers, agents, and interlinked leads."""

import asyncio

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


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def main() -> None:
    db = Prisma()
    await db.connect()

    password_hash = hash_password("Admin@123")
    center_by_code: dict[str, object] = {}
    admin_by_center: dict[str, object] = {}
    agents_by_center: dict[str, list] = {}

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
            "update": {},
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
                "update": {},
            },
        )
        center_by_code[code] = center

        admin = await db.user.upsert(
            where={"id": f"seed-admin-{code.lower()}"},
            data={
                "create": {
                    "id": f"seed-admin-{code.lower()}",
                    "email": f"admin.{code.lower()}@centercrm.com",
                    "passwordHash": password_hash,
                    "firstName": f"{name}",
                    "lastName": "Admin",
                    "role": "ADMIN",
                    "centerId": center.id,
                    "isActive": True,
                },
                "update": {},
            },
        )
        admin_by_center[code] = admin

        agents_by_center[code] = []
        for i in range(1, 4):
            agent = await db.user.upsert(
                where={"id": f"seed-agent-{code.lower()}-{i}"},
                data={
                    "create": {
                        "id": f"seed-agent-{code.lower()}-{i}",
                        "email": f"agent{i}.{code.lower()}@centercrm.com",
                        "passwordHash": password_hash,
                        "firstName": f"Agent{i}",
                        "lastName": code.title(),
                        "role": "AGENT",
                        "centerId": center.id,
                        "isActive": True,
                    },
                    "update": {},
                },
            )
            agents_by_center[code].append(agent)

    lead_specs = [
        ("seed-lead-01", "Rahul Sharma", "+919876543210", "rahul@example.com", "HQ", 0, "NEW", False),
        ("seed-lead-02", "Priya Patel", "+919876543211", "priya@example.com", "NORTH", 1, "ATTEMPTED", False),
        ("seed-lead-03", "Amit Kumar", "+919876543212", "amit@example.com", "SOUTH", 2, "FOLLOW_UP", False),
        ("seed-lead-04", "Sneha Reddy", "+919876543213", "sneha@example.com", "EAST", 0, "INTERESTED", False),
        ("seed-lead-05", "Vikram Singh", "+919876543214", "vikram@example.com", "WEST", 1, "CALLBACK", False),
        ("seed-auto-parts-1", "John Doe", "5551234567", "john@example.com", "HQ", 0, "NEW", True),
        ("seed-auto-parts-2", "Jane Smith", "5559876543", "jane@example.com", "NORTH", 1, "ATTEMPTED", True),
        ("seed-auto-parts-3", "Mike Johnson", "5554443322", "mike@example.com", "SOUTH", 2, "FOLLOW_UP", True),
        ("seed-auto-parts-4", "Sarah Lee", "5551112233", "sarah@example.com", "EAST", 0, "INTERESTED", True),
        ("seed-auto-parts-5", "Tom Brown", "5557778899", "tom@example.com", "WEST", 1, "UNATTEMPTED", True),
    ]

    created_leads = []
    for lead_id, name, phone, email, center_code, agent_idx, status, is_auto in lead_specs:
        center = center_by_code[center_code]
        admin = admin_by_center[center_code]
        agent = agents_by_center[center_code][agent_idx % 3]
        meta = AUTO_PARTS_META[len(created_leads) % len(AUTO_PARTS_META)] if is_auto else {}

        existing = await db.lead.find_first(where={"id": lead_id})
        if existing:
            created_leads.append(existing)
            continue

        data = {
            "id": lead_id,
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
        }
        if is_auto:
            data["courseInterest"] = meta.get("part_name")
            data["message"] = f"Purchase: {meta.get('purchase_timeline')} · {meta.get('comment', '')}"
            data["metadata"] = Json(meta)
        else:
            data["courseInterest"] = "Auto Parts Management"

        lead = await db.lead.create(data=data)
        created_leads.append(lead)

    remark_samples = [
        ("Initial outreach — left voicemail", "seed-agent-hq-1"),
        ("Customer asked for quote via email", "seed-agent-north-2"),
        ("Scheduled callback for tomorrow 10am", "seed-agent-south-1"),
        ("Sent parts catalog PDF", "seed-agent-east-3"),
        ("Price match requested — pending approval", "seed-agent-west-2"),
    ]
    for i, lead in enumerate(created_leads[:5]):
        body, author_id = remark_samples[i]
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
                    "outcome": "Reached — discussed requirements",
                }
            )

    await db.disconnect()
    print("Python seed completed: 5 centers, 5 admins, 15 agents, 10 leads with sample activity.")


if __name__ == "__main__":
    asyncio.run(main())
