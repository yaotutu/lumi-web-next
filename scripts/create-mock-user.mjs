import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: 'user_dev_001' },
    update: {},
    create: {
      id: 'user_dev_001',
      email: 'dev@lumi.com',
      name: 'Development User'
    }
  });
  console.log('用户创建成功:', JSON.stringify(user, null, 2));
}

main()
  .catch(e => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
