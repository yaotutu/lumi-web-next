#!/usr/bin/env npx tsx

/**
 * 测试存储适配器选择
 */

import { createStorageProvider } from '../lib/providers/storage/factory';

const storageProvider = createStorageProvider();

console.log('当前存储适配器:', storageProvider.getName());
console.log('配置环境变量:');
console.log('- TENCENT_COS_SECRET_ID:', process.env.TENCENT_COS_SECRET_ID ? '已设置' : '未设置');
console.log('- ALIYUN_OSS_ACCESS_KEY_ID:', process.env.ALIYUN_OSS_ACCESS_KEY_ID ? '已设置' : '未设置');