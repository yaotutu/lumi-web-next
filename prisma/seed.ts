import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...\n");

  // 创建开发用户
  const mockUser = await prisma.user.upsert({
    where: { email: "dev@lumi.com" },
    update: {},
    create: {
      id: "user_dev_001",
      email: "dev@lumi.com",
      name: "Development User",
    },
  });

  console.log("✅ Mock user created:");
  console.log(`   ID: ${mockUser.id}`);
  console.log(`   Email: ${mockUser.email}`);
  console.log(`   Name: ${mockUser.name}\n`);

  console.log("✅ Database seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
