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

  // 创建队列配置
  const imageQueueConfig = await prisma.queueConfig.upsert({
    where: { queueName: "image_generation" },
    update: {},
    create: {
      queueName: "image_generation",
      maxConcurrency: 3,
      jobTimeout: 120000,
      maxRetries: 3,
      retryDelayBase: 5000,
      retryDelayMax: 60000,
      enablePriority: false,
      isActive: true,
    },
  });

  const modelQueueConfig = await prisma.queueConfig.upsert({
    where: { queueName: "model_generation" },
    update: {},
    create: {
      queueName: "model_generation",
      maxConcurrency: 1,
      jobTimeout: 300000,
      maxRetries: 3,
      retryDelayBase: 10000,
      retryDelayMax: 120000,
      enablePriority: false,
      isActive: true,
    },
  });

  console.log("✅ Queue configs created:");
  console.log(
    `   - ${imageQueueConfig.queueName} (maxConcurrency: ${imageQueueConfig.maxConcurrency})`,
  );
  console.log(
    `   - ${modelQueueConfig.queueName} (maxConcurrency: ${modelQueueConfig.maxConcurrency})\n`,
  );

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
