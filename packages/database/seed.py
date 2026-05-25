"""Seed database with default users and sample data."""

import asyncio

from passlib.context import CryptContext

from prisma import Prisma

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def main() -> None:
    db = Prisma()
    await db.connect()

    password_hash = pwd_context.hash("Admin@123")

    center = await db.center.upsert(
        where={"code": "HQ"},
        data={
            "create": {
                "name": "Headquarters",
                "code": "HQ",
                "settings": {"maxAttempts": 5, "timezone": "Asia/Kolkata"},
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
                "permissions": {"all": True},
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

    await db.disconnect()
    print("Python seed completed.")


if __name__ == "__main__":
    asyncio.run(main())
