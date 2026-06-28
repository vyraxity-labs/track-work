import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Seed Admin
  const adminCount = await prisma.admin.count();
  if (adminCount === 0) {
    const defaultPin = "1234";
    const hashedPin = bcrypt.hashSync(defaultPin, 10);
    await prisma.admin.create({
      data: {
        pin: hashedPin,
      },
    });
    console.log(`- Created default Admin with PIN: ${defaultPin}`);
  } else {
    console.log("- Admin PIN already exists. Skipping.");
  }

  // 2. Seed Workers
  const defaultWorkers = [
    { name: "Marcus Henderson" },
    { name: "Elena Rodriguez" },
    { name: "Samir Gupta" },
    { name: "Jessica Lee" },
    { name: "David Chen" },
  ];

  console.log("- Seeding workers...");
  for (const w of defaultWorkers) {
    const existing = await prisma.worker.findFirst({
      where: { name: w.name },
    });

    if (!existing) {
      const created = await prisma.worker.create({
        data: {
          name: w.name,
          isActive: true,
        },
      });
      console.log(`  + Created worker: ${created.name}`);
    } else {
      console.log(`  o Worker ${w.name} already exists. Skipping.`);
    }
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
