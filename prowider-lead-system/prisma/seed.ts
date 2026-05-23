// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create 3 Services
  const service1 = await prisma.service.upsert({
    where: { name: "Service 1" },
    update: {},
    create: { name: "Service 1" },
  });
  const service2 = await prisma.service.upsert({
    where: { name: "Service 2" },
    update: {},
    create: { name: "Service 2" },
  });
  const service3 = await prisma.service.upsert({
    where: { name: "Service 3" },
    update: {},
    create: { name: "Service 3" },
  });

  console.log("Services created:", service1.name, service2.name, service3.name);

  // Create 8 Providers
  const providerNames = [
    "Provider 1",
    "Provider 2",
    "Provider 3",
    "Provider 4",
    "Provider 5",
    "Provider 6",
    "Provider 7",
    "Provider 8",
  ];

  for (const name of providerNames) {
    await prisma.provider.upsert({
      where: { name },
      update: {},
      create: { name, monthlyQuota: 10, currentMonthLeads: 0, fairPickCount: 0 },
    });
  }

  console.log("8 providers seeded.");
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
