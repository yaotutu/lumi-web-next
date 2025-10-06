# OSS 对接指南

## 当前状态

### ⚠️ 临时方案

**图片存储**：阿里云返回的临时URL（24小时有效期）

```
数据库存储示例：
url: "https://dashscope-result.oss-cn-beijing.aliyuncs.com/xxx.png"
```

**风险**：
- ⚠️ 24小时后图片链接失效
- ⚠️ 依赖阿里云服务可用性
- ⚠️ 每次访问消耗阿里云流量

---

## TODO: OSS 对接方案

### 目标

将阿里云生成的临时图片下载并保存到永久存储（本地文件系统或OSS）。

---

## 方案一：本地文件系统（开发/小规模）

### 实现步骤

#### 1. 启用图片下载逻辑

在 `lib/task-queue.ts` 中取消注释 `downloadAndSaveImage` 函数：

```typescript
import { LocalStorage } from "./storage";

async function downloadAndSaveImage(
  aliyunUrl: string,
  taskId: string,
  index: number,
): Promise<string> {
  // 判断是Base64还是HTTP URL
  if (aliyunUrl.startsWith("data:image")) {
    // Base64格式 - 直接保存
    return await LocalStorage.saveTaskImage(taskId, index, aliyunUrl);
  } else {
    // HTTP URL - 下载后保存
    const response = await fetch(aliyunUrl);
    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return await LocalStorage.saveTaskImage(taskId, index, buffer);
  }
}
```

#### 2. 修改图片保存逻辑

在 `lib/task-queue.ts` 的 `processTask` 函数中：

```typescript
for await (const imageUrl of generateImageStream(prompt, remainingCount)) {
  // ✅ 启用下载逻辑
  const localUrl = await downloadAndSaveImage(imageUrl, taskId, index);

  await prisma.taskImage.create({
    data: {
      taskId,
      url: localUrl,  // 存储本地路径: /generated/images/{taskId}/0.png
      index,
    },
  });

  index++;
}
```

#### 3. 存储位置

```
public/
  └── generated/
      └── images/
          └── {taskId}/
              ├── 0.png
              ├── 1.png
              ├── 2.png
              └── 3.png
```

**访问URL**: `http://localhost:3000/generated/images/{taskId}/0.png`

#### 4. 优缺点

✅ **优点**：
- 实现简单，无需第三方服务
- 成本低（仅消耗服务器磁盘）
- 完全控制

❌ **缺点**：
- 占用服务器磁盘空间
- 不适合分布式部署（多台服务器无法共享文件）
- 备份/迁移需要手动处理

---

## 方案二：对接云OSS（生产环境推荐）

### 2.1 阿里云OSS

#### 安装依赖

```bash
npm install ali-oss
```

#### 配置环境变量

```env
# .env.local
OSS_REGION=oss-cn-beijing
OSS_ACCESS_KEY_ID=your_access_key
OSS_ACCESS_KEY_SECRET=your_secret
OSS_BUCKET=your-bucket-name
```

#### 实现代码

创建 `lib/oss.ts`:

```typescript
import OSS from 'ali-oss';

const client = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET!,
});

/**
 * 上传图片到阿里云OSS
 */
export async function uploadImageToOSS(
  buffer: Buffer,
  taskId: string,
  index: number,
): Promise<string> {
  const filename = `images/${taskId}/${index}.png`;

  await client.put(filename, buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000', // 缓存1年
    },
  });

  // 返回公网访问URL
  return `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${filename}`;
}

/**
 * 从阿里云文生图URL下载并上传到自己的OSS
 */
export async function downloadAndUploadToOSS(
  aliyunUrl: string,
  taskId: string,
  index: number,
): Promise<string> {
  // 下载图片
  const response = await fetch(aliyunUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  // 上传到自己的OSS
  return await uploadImageToOSS(buffer, taskId, index);
}
```

#### 修改 task-queue.ts

```typescript
import { downloadAndUploadToOSS } from "./oss";

for await (const imageUrl of generateImageStream(prompt, remainingCount)) {
  // ✅ 上传到OSS
  const ossUrl = await downloadAndUploadToOSS(imageUrl, taskId, index);

  await prisma.taskImage.create({
    data: {
      taskId,
      url: ossUrl,  // 永久URL
      index,
    },
  });

  index++;
}
```

### 2.2 其他云服务商

**腾讯云COS**:
```bash
npm install cos-nodejs-sdk-v5
```

**AWS S3**:
```bash
npm install @aws-sdk/client-s3
```

**七牛云**:
```bash
npm install qiniu
```

实现逻辑类似，参考各自官方文档。

---

## 方案三：混合方案（推荐）

### 策略

1. **开发环境**：使用本地文件系统（LocalStorage）
2. **生产环境**：使用云OSS

### 实现

创建统一的存储抽象层 `lib/image-storage.ts`:

```typescript
import { LocalStorage } from "./storage";
import { downloadAndUploadToOSS } from "./oss";

/**
 * 根据环境自动选择存储方式
 */
export async function saveImage(
  aliyunUrl: string,
  taskId: string,
  index: number,
): Promise<string> {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && process.env.OSS_BUCKET) {
    // 生产环境 + OSS已配置 → 使用OSS
    return await downloadAndUploadToOSS(aliyunUrl, taskId, index);
  } else {
    // 开发环境 或 OSS未配置 → 使用本地存储
    const response = await fetch(aliyunUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    return await LocalStorage.saveTaskImage(taskId, index, buffer);
  }
}
```

在 `task-queue.ts` 中使用：

```typescript
import { saveImage } from "./image-storage";

for await (const imageUrl of generateImageStream(prompt, remainingCount)) {
  const permanentUrl = await saveImage(imageUrl, taskId, index);

  await prisma.taskImage.create({
    data: {
      taskId,
      url: permanentUrl,
      index,
    },
  });

  index++;
}
```

---

## 实施检查清单

### 开发阶段（本地存储）

- [ ] 取消注释 `downloadAndSaveImage` 函数
- [ ] 修改 `processTask` 调用 `downloadAndSaveImage`
- [ ] 确保 `public/generated` 目录可写
- [ ] 测试图片下载和保存
- [ ] 验证前端可以正常访问图片
- [ ] 添加 `.gitignore` 忽略 `public/generated`

### 生产阶段（OSS）

- [ ] 选择云服务商（阿里云/腾讯云/AWS等）
- [ ] 创建OSS Bucket
- [ ] 配置公网访问权限
- [ ] 安装对应SDK
- [ ] 实现 `oss.ts` 上传逻辑
- [ ] 配置环境变量
- [ ] 测试OSS上传和访问
- [ ] 设置CDN加速（可选）
- [ ] 配置备份策略

---

## 数据迁移

### 从临时URL迁移到永久存储

如果已有任务使用临时URL，需要迁移：

创建迁移脚本 `scripts/migrate-images.ts`:

```typescript
import { prisma } from "@/lib/db/prisma";
import { saveImage } from "@/lib/image-storage";

async function migrateImages() {
  // 查询所有使用临时URL的图片
  const images = await prisma.taskImage.findMany({
    where: {
      url: { startsWith: "https://dashscope-result" }
    }
  });

  console.log(`找到 ${images.length} 张需要迁移的图片`);

  for (const image of images) {
    try {
      // 下载并保存到永久存储
      const permanentUrl = await saveImage(image.url, image.taskId, image.index);

      // 更新数据库
      await prisma.taskImage.update({
        where: { id: image.id },
        data: { url: permanentUrl }
      });

      console.log(`✅ 已迁移: ${image.id}`);
    } catch (error) {
      console.error(`❌ 迁移失败: ${image.id}`, error);
    }
  }

  console.log("迁移完成！");
}

migrateImages();
```

运行迁移：
```bash
npx tsx scripts/migrate-images.ts
```

---

## 成本估算

### 本地存储

**存储成本**: 约 1MB/张 × 4张 = 4MB/任务
- 1000个任务 ≈ 4GB 磁盘
- 成本: 几乎为0（使用服务器磁盘）

### 阿里云OSS

**存储成本**: ￥0.12/GB/月
- 1000个任务 (4GB) = ￥0.48/月

**流量成本**: ￥0.50/GB（外网流出）
- 假设每张图片被访问10次
- 1000任务 × 4图 × 1MB × 10次 = 40GB
- 成本: ￥20/月

**总计**: 约 ￥20.48/月（1000个任务）

---

## 常见问题

### Q1: 阿里云临时URL什么时候失效？

**A**: 通常24小时后失效，具体时间取决于阿里云策略。

### Q2: 如果图片已过期，用户还能看到吗？

**A**: 不能。链接失效后返回403或404错误。

### Q3: 需要备份吗？

**A**:
- 本地存储：需要定期备份 `public/generated` 目录
- OSS：云服务商通常有自动备份，建议启用跨区域复制

### Q4: 多台服务器如何共享图片？

**A**:
- 方案1：使用OSS（推荐）
- 方案2：使用NFS共享存储
- 方案3：使用CDN同步

---

**文档版本**: v1.0
**创建日期**: 2025-10-06
**维护者**: AI Assistant
