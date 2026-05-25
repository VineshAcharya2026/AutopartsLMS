import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  const center = await prisma.center.upsert({
    where: { code: "HQ" },
    update: {},
    create: {
      name: "Headquarters",
      code: "HQ",
      settings: { maxAttempts: 5, timezone: "Asia/Kolkata" },
    },
  });

  await prisma.user.upsert({
    where: { id: "seed-master-admin" },
    update: {},
    create: {
      id: "seed-master-admin",
      email: "master@centercrm.com",
      passwordHash,
      firstName: "Master",
      lastName: "Admin",
      role: "MASTER_ADMIN",
      isActive: true,
      permissions: { all: true },
    },
  });

  const admin = await prisma.user.upsert({
    where: { id: "seed-admin" },
    update: {},
    create: {
      id: "seed-admin",
      email: "admin@centercrm.com",
      passwordHash,
      firstName: "Center",
      lastName: "Admin",
      role: "ADMIN",
      centerId: center.id,
      isActive: true,
      permissions: {},
    },
  });

  await prisma.user.upsert({
    where: { id: "seed-agent" },
    update: {},
    create: {
      id: "seed-agent",
      email: "agent@centercrm.com",
      passwordHash,
      firstName: "Sales",
      lastName: "Agent",
      role: "AGENT",
      centerId: center.id,
      isActive: true,
      permissions: {},
    },
  });

  await prisma.lead.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "seed-lead-1",
        name: "Rahul Sharma",
        phone: "+919876543210",
        email: "rahul@example.com",
        source: "WEBSITE_FORM",
        status: "NEW",
        centerId: center.id,
        assignedAdminId: admin.id,
        courseInterest: "Auto Parts Management",
        city: "Mumbai",
      },
      {
        id: "seed-lead-2",
        name: "Priya Patel",
        phone: "+919876543211",
        email: "priya@example.com",
        source: "LANDING_PAGE",
        status: "FOLLOW_UP",
        centerId: center.id,
        assignedAdminId: admin.id,
        courseInterest: "CRM Training",
        city: "Delhi",
        followUpAt: new Date(Date.now() + 86400000),
      },
    ],
  });

  await prisma.integration.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "seed-form-integration",
        name: "Main Website Form",
        type: "FORM",
        centerId: center.id,
        apiKey: "form_key_demo_replace_in_prod",
        isActive: true,
        config: { website: "https://example.com" },
      },
      {
        id: "seed-landing-integration",
        name: "Summer Campaign Landing",
        type: "LANDING",
        centerId: center.id,
        apiKey: "landing_key_demo_replace_in_prod",
        isActive: true,
        config: { campaign: "summer-2026" },
      },
    ],
  });

  console.log("Seed completed.");
  console.log("Master Admin: master@centercrm.com / Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
