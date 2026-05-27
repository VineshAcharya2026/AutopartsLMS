"""Seed database with default users and sample data."""

import asyncio

import bcrypt
from prisma import Json, Prisma


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def main() -> None:
    db = Prisma()
    await db.connect()

    password_hash = hash_password("Admin@123")

    center = await db.center.upsert(
        where={"code": "HQ"},
        data={
            "create": {
                "name": "Headquarters",
                "code": "HQ",
                "settings": Json({"maxAttempts": 5, "timezone": "Asia/Kolkata"}),
            },
            "update": {},
        },
    )

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

    admin = await db.user.upsert(
        where={"id": "seed-admin"},
        data={
            "create": {
                "id": "seed-admin",
                "email": "admin@centercrm.com",
                "passwordHash": password_hash,
                "firstName": "Center",
                "lastName": "Admin",
                "role": "ADMIN",
                "centerId": center.id,
                "isActive": True,
            },
            "update": {},
        },
    )

    await db.user.upsert(
        where={"id": "seed-agent"},
        data={
            "create": {
                "id": "seed-agent",
                "email": "agent@centercrm.com",
                "passwordHash": password_hash,
                "firstName": "Sales",
                "lastName": "Agent",
                "role": "AGENT",
                "centerId": center.id,
                "isActive": True,
            },
            "update": {},
        },
    )

    existing_lead = await db.lead.find_first(where={"id": "seed-lead-1"})
    if not existing_lead:
        await db.lead.create(
            data={
                "id": "seed-lead-1",
                "name": "Rahul Sharma",
                "phone": "+919876543210",
                "email": "rahul@example.com",
                "source": "WEBSITE_FORM",
                "status": "NEW",
                "centerId": center.id,
                "assignedAdminId": admin.id,
                "courseInterest": "Auto Parts Management",
                "city": "Mumbai",
            }
        )

    existing_auto_parts = await db.lead.find_first(where={"id": "seed-auto-parts-1"})
    if not existing_auto_parts:
        await db.lead.create(
            data={
                "id": "seed-auto-parts-1",
                "name": "John Doe",
                "phone": "5551234567",
                "email": "john@example.com",
                "source": "WEBSITE_FORM",
                "status": "NEW",
                "centerId": center.id,
                "assignedAdminId": admin.id,
                "courseInterest": "Engine",
                "city": "90210",
                "message": "Need OEM preferred · Purchase: Immediately",
                "sourceWebsite": "used-carparts.us",
                "metadata": Json(
                    {
                        "year": "2018",
                        "make": "Toyota",
                        "brand": "Toyota",
                        "model": "Camry",
                        "part_name": "Engine",
                        "vin": "1HGCM82633A004352",
                        "zip_code": "90210",
                        "purchase_timeline": "Immediately",
                        "comment": "Need OEM preferred",
                    }
                ),
            }
        )

    await db.disconnect()
    print("Python seed completed.")


if __name__ == "__main__":
    asyncio.run(main())
