#!/usr/bin/env npx tsx

/**
 * 检查并创建演示用户
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_EMAIL = 'demo@demo.com';
const DEMO_NAME = 'Demo User';

async function checkAndCreateDemoUser() {
  try {
    console.log('检查演示用户:', DEMO_EMAIL);

    // 检查是否已存在
    let user = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL }
    });

    if (user) {
      console.log('✅ 演示用户已存在');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Created At:', user.createdAt);

      // 检查用户数据
      const [requestCount, modelCount] = await Promise.all([
        prisma.generationRequest.count({ where: { userId: user.id } }),
        prisma.model.count({ where: { userId: user.id } })
      ]);

      console.log('Generation Requests:', requestCount);
      console.log('Models:', modelCount);

    } else {
      console.log('❌ 演示用户不存在，创建中...');

      user = await prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          name: DEMO_NAME,
          lastLoginAt: new Date()
        }
      });

      console.log('✅ 演示用户创建成功');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
    }

  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateDemoUser();