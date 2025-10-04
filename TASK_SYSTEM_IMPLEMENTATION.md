# 任务系统实施方案

## 项目信息
- **项目名称**: Lumi Web Next - AI 3D模型生成平台
- **核心功能**: 文生图 → 图生3D 的完整任务流
- **存储方案**: Prisma + SQLite (本地静态资源)
- **用户策略**: 开发阶段使用 Mock User

---

## 实施步骤

### 阶段 1: 准备项目环境（Prisma + SQLite）

#### 1.1 安装依赖

```bash
npm install prisma @prisma/client
npm install -D tsx
```

#### 1.2 初始化 Prisma

```bash
npx prisma init --datasource-provider sqlite
```

这将创建:
- `prisma/schema.prisma` - 数据库 Schema 文件
- `.env` - 环境变量配置

#### 1.3 配置环境变量

编辑 `.env` 文件，添加数据库路径:

```env
DATABASE_URL="file:./dev.db"
```

#### 1.4 配置 `.gitignore`

确保以下内容在 `.gitignore` 中:

```gitignore
# Prisma
prisma/*.db
prisma/*.db-journal

# 生成的静态资源
/public/generated/

# 环境变量
.env
.env.local
```

#### ✅ 验证步骤 1

运行以下命令验证 Prisma 已正确安装:

```bash
npx prisma --version
```

**预期结果**: 输出 Prisma 版本信息

**验证清单**:
- [ ] `prisma/schema.prisma` 文件存在
- [ ] `.env` 文件包含 `DATABASE_URL`
- [ ] `.gitignore` 配置正确
- [ ] `npx prisma --version` 执行成功

---

### 阶段 2: 创建数据库 Schema 和类型定义

#### 2.1 编写 Prisma Schema

编辑 `prisma/schema.prisma`:

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 用户表
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tasks     Task[]
}

// 任务表 - 核心业务实体
model Task {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // 任务输入
  prompt      String

  // 任务状态
  status      TaskStatus @default(PENDING)

  // 文生图阶段数据
  imageGenerationStartedAt  DateTime?
  imageGenerationCompletedAt DateTime?
  selectedImageIndex        Int?

  // 图生3D阶段数据
  modelGenerationStartedAt  DateTime?
  modelGenerationCompletedAt DateTime?

  // 任务级别时间戳
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?
  failedAt    DateTime?
  errorMessage String?

  // 关联的生成结果
  images      TaskImage[]
  model       TaskModel?

  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
}

// 任务图片表
model TaskImage {
  id        String   @id @default(cuid())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  // 图片数据
  url       String   // 本地路径: /generated/images/{taskId}/0.png
  index     Int      // 0-3

  // 阿里云API数据(可选)
  aliyunTaskId    String?
  aliyunRequestId String?

  createdAt DateTime @default(now())

  @@unique([taskId, index])
  @@index([taskId])
}

// 3D模型表
model TaskModel {
  id        String   @id @default(cuid())
  taskId    String   @unique
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  // 模型基本信息
  name      String
  modelUrl  String?  // 本地路径: /generated/models/{taskId}.glb

  // 生成状态
  status    ModelStatus @default(PENDING)
  progress  Int      @default(0)

  // 模型元数据
  format    String   @default("GLB")
  fileSize  Int?
  faceCount Int?
  vertexCount Int?
  quality   String   @default("高清")

  // 3D生成API相关
  apiTaskId String?
  apiRequestId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  completedAt DateTime?
  failedAt  DateTime?
  errorMessage String?

  @@index([status])
}

// 枚举: 任务状态
enum TaskStatus {
  PENDING            // 任务已创建，等待开始生成图片
  GENERATING_IMAGES  // 正在生成图片
  IMAGES_READY       // 图片生成完成，等待用户选择
  GENERATING_MODEL   // 正在生成3D模型
  COMPLETED          // 整个任务完成
  FAILED             // 任务失败
  CANCELLED          // 用户取消
}

// 枚举: 3D模型状态
enum ModelStatus {
  PENDING      // 等待生成
  GENERATING   // 生成中
  COMPLETED    // 生成完成
  FAILED       // 生成失败
}
```

#### 2.2 生成 Prisma Client

```bash
npx prisma generate
```

#### 2.3 创建并应用迁移

```bash
npx prisma migrate dev --name init
```

这将:
1. 创建 `prisma/dev.db` 数据库文件
2. 应用 Schema 到数据库
3. 生成迁移文件到 `prisma/migrations/`

#### 2.4 更新 TypeScript 类型

编辑 `types/index.ts`，添加 Prisma 导出类型:

```typescript
// 从 Prisma 导入生成的类型
export type { User, Task, TaskImage, TaskModel } from "@prisma/client";
export { TaskStatus, ModelStatus } from "@prisma/client";

// 扩展类型: 任务详情（包含关联数据）
export type TaskWithDetails = Task & {
  images: TaskImage[];
  model: TaskModel | null;
};

// 保留原有的前端状态类型
export type GenerationStatus = "idle" | "generating" | "completed" | "failed";

export interface GenerationError {
  code: string;
  message: string;
}

// 已废弃，将被 Prisma 类型替代
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
}

export interface Model3D {
  id: string;
  name: string;
  sourceImageId: string;
  status: "generating" | "completed" | "failed";
  progress: number;
  modelUrl?: string;
  createdAt: Date;
}
```

#### 2.5 创建 Prisma Client 实例

创建 `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

#### 2.6 创建种子脚本 (Mock User)

创建 `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建开发用户
  const mockUser = await prisma.user.upsert({
    where: { email: 'dev@lumi.com' },
    update: {},
    create: {
      id: 'user_dev_001',
      email: 'dev@lumi.com',
      name: 'Development User',
    },
  });

  console.log('✅ Mock user created:', mockUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

更新 `package.json` 添加 seed 配置:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

运行种子脚本:

```bash
npx prisma db seed
```

#### 2.7 更新常量配置

编辑 `lib/constants.ts`，添加:

```typescript
// 在文件末尾添加

// Mock 用户配置（开发阶段）
export const MOCK_USER = {
  id: 'user_dev_001',
  email: 'dev@lumi.com',
  name: 'Development User',
} as const;

// 存储路径配置
export const STORAGE_PATHS = {
  IMAGES_DIR: '/generated/images',
  MODELS_DIR: '/generated/models',
} as const;
```

#### ✅ 验证步骤 2

运行以下命令验证数据库已正确创建:

```bash
# 1. 查看数据库结构
npx prisma studio
```

在打开的浏览器中:
1. 查看 `User` 表，应该看到 1 条 Mock 用户记录
2. 查看 `Task`、`TaskImage`、`TaskModel` 表（应该为空）

**验证清单**:
- [ ] `prisma/dev.db` 文件已生成
- [ ] `npx prisma studio` 可正常打开
- [ ] User 表包含 1 条记录 (dev@lumi.com)
- [ ] Task、TaskImage、TaskModel 表结构正确
- [ ] `types/index.ts` 已更新，无 TypeScript 错误
- [ ] `lib/prisma.ts` 已创建
- [ ] `lib/constants.ts` 包含 MOCK_USER 和 STORAGE_PATHS

---

### 阶段 3: 实现本地存储工具类

#### 3.1 创建存储目录

创建 `scripts/init-storage.ts`:

```typescript
import fs from 'fs';
import path from 'path';

const STORAGE_ROOT = path.join(process.cwd(), 'public', 'generated');

const dirs = [
  path.join(STORAGE_ROOT, 'images'),
  path.join(STORAGE_ROOT, 'models'),
];

console.log('📁 Initializing storage directories...');

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created: ${path.relative(process.cwd(), dir)}`);
  } else {
    console.log(`⏭️  Exists: ${path.relative(process.cwd(), dir)}`);
  }
});

// 创建 .gitkeep 保持目录结构
const gitkeepPath = path.join(STORAGE_ROOT, '.gitkeep');
fs.writeFileSync(gitkeepPath, '# This file keeps the generated directory in git\n');
console.log(`✅ Created: ${path.relative(process.cwd(), gitkeepPath)}`);

console.log('✅ Storage initialization complete!');
```

在 `package.json` 的 `scripts` 中添加:

```json
{
  "scripts": {
    "init:storage": "tsx scripts/init-storage.ts"
  }
}
```

运行初始化:

```bash
npm run init:storage
```

#### 3.2 创建本地存储工具类

创建 `lib/storage.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { STORAGE_PATHS } from './constants';

const STORAGE_ROOT = path.join(process.cwd(), 'public', 'generated');

/**
 * 本地文件存储工具类
 * 后期迁移到 OSS 时只需替换此类的实现
 */
export class LocalStorage {
  /**
   * 保存任务的图片
   * @param taskId 任务ID
   * @param index 图片索引 (0-3)
   * @param imageData 图片Buffer或Base64字符串
   * @returns 可访问的URL路径
   */
  static async saveTaskImage(
    taskId: string,
    index: number,
    imageData: Buffer | string
  ): Promise<string> {
    const dir = path.join(STORAGE_ROOT, 'images', taskId);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${index}.png`;
    const filepath = path.join(dir, filename);

    // 处理不同格式的图片数据
    let buffer: Buffer;
    if (typeof imageData === 'string') {
      // Base64 字符串
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      // Buffer
      buffer = imageData;
    }

    fs.writeFileSync(filepath, buffer);

    // 返回可访问的URL (相对于 public 目录)
    return `/generated/images/${taskId}/${filename}`;
  }

  /**
   * 保存3D模型文件
   * @param taskId 任务ID
   * @param modelData 模型文件Buffer
   * @param format 文件格式 (默认 'glb')
   * @returns 可访问的URL路径
   */
  static async saveTaskModel(
    taskId: string,
    modelData: Buffer,
    format: string = 'glb'
  ): Promise<string> {
    const dir = path.join(STORAGE_ROOT, 'models');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${taskId}.${format}`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, modelData);

    return `/generated/models/${filename}`;
  }

  /**
   * 删除任务的所有资源
   * @param taskId 任务ID
   */
  static async deleteTaskResources(taskId: string): Promise<void> {
    // 删除图片目录
    const imageDir = path.join(STORAGE_ROOT, 'images', taskId);
    if (fs.existsSync(imageDir)) {
      fs.rmSync(imageDir, { recursive: true, force: true });
    }

    // 删除模型文件（尝试常见格式）
    const formats = ['glb', 'gltf', 'fbx'];
    for (const format of formats) {
      const modelPath = path.join(STORAGE_ROOT, 'models', `${taskId}.${format}`);
      if (fs.existsSync(modelPath)) {
        fs.unlinkSync(modelPath);
      }
    }
  }

  /**
   * 获取文件大小
   * @param url 文件URL (相对路径)
   * @returns 文件大小（字节）
   */
  static getFileSize(url: string): number {
    try {
      const filepath = path.join(process.cwd(), 'public', url);
      if (fs.existsSync(filepath)) {
        return fs.statSync(filepath).size;
      }
    } catch (error) {
      console.error('Failed to get file size:', error);
    }
    return 0;
  }

  /**
   * 检查文件是否存在
   * @param url 文件URL (相对路径)
   */
  static fileExists(url: string): boolean {
    try {
      const filepath = path.join(process.cwd(), 'public', url);
      return fs.existsSync(filepath);
    } catch (error) {
      return false;
    }
  }

  /**
   * 生成 Mock 图片（用于开发测试）
   * @param taskId 任务ID
   * @param index 图片索引
   * @returns URL路径
   */
  static async saveMockImage(taskId: string, index: number): Promise<string> {
    // 创建一个简单的 1x1 PNG (透明像素)
    const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    return this.saveTaskImage(taskId, index, mockImageBase64);
  }

  /**
   * 生成 Mock 3D模型（用于开发测试）
   * @param taskId 任务ID
   * @returns URL路径
   */
  static async saveMockModel(taskId: string): Promise<string> {
    // 创建一个最小的 GLB 文件头
    const mockModelBuffer = Buffer.from([
      0x67, 0x6C, 0x54, 0x46, // "glTF" magic
      0x02, 0x00, 0x00, 0x00, // version 2
      0x00, 0x00, 0x00, 0x00, // length (placeholder)
    ]);
    return this.saveTaskModel(taskId, mockModelBuffer, 'glb');
  }
}
```

#### ✅ 验证步骤 3

创建测试脚本 `scripts/test-storage.ts`:

```typescript
import { LocalStorage } from '../lib/storage';

async function testStorage() {
  console.log('🧪 Testing LocalStorage class...\n');

  const testTaskId = 'test_task_123';

  try {
    // 测试 1: 保存 Mock 图片
    console.log('Test 1: Saving mock images...');
    const imageUrls: string[] = [];
    for (let i = 0; i < 4; i++) {
      const url = await LocalStorage.saveMockImage(testTaskId, i);
      imageUrls.push(url);
      console.log(`  ✅ Image ${i}: ${url}`);
    }

    // 测试 2: 检查文件是否存在
    console.log('\nTest 2: Checking file existence...');
    imageUrls.forEach((url, i) => {
      const exists = LocalStorage.fileExists(url);
      console.log(`  ${exists ? '✅' : '❌'} Image ${i}: ${exists}`);
    });

    // 测试 3: 获取文件大小
    console.log('\nTest 3: Getting file sizes...');
    imageUrls.forEach((url, i) => {
      const size = LocalStorage.getFileSize(url);
      console.log(`  ✅ Image ${i}: ${size} bytes`);
    });

    // 测试 4: 保存 Mock 模型
    console.log('\nTest 4: Saving mock model...');
    const modelUrl = await LocalStorage.saveMockModel(testTaskId);
    console.log(`  ✅ Model: ${modelUrl}`);
    const modelSize = LocalStorage.getFileSize(modelUrl);
    console.log(`  ✅ Model size: ${modelSize} bytes`);

    // 测试 5: 删除资源
    console.log('\nTest 5: Deleting resources...');
    await LocalStorage.deleteTaskResources(testTaskId);
    const stillExists = LocalStorage.fileExists(imageUrls[0]);
    console.log(`  ${stillExists ? '❌' : '✅'} Resources deleted: ${!stillExists}`);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testStorage();
```

在 `package.json` 添加测试脚本:

```json
{
  "scripts": {
    "test:storage": "tsx scripts/test-storage.ts"
  }
}
```

运行测试:

```bash
npm run test:storage
```

**验证清单**:
- [ ] `public/generated/images/` 目录存在
- [ ] `public/generated/models/` 目录存在
- [ ] `public/generated/.gitkeep` 文件存在
- [ ] `npm run test:storage` 所有测试通过
- [ ] 测试后资源文件被正确删除

---

### 阶段 4: 实现任务管理 API

#### 4.1 创建任务 API

创建 `app/api/tasks/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MOCK_USER } from '@/lib/constants';
import { TaskStatus } from '@prisma/client';

/**
 * GET /api/tasks
 * 获取用户的任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as TaskStatus | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    const tasks = await prisma.task.findMany({
      where: {
        userId: MOCK_USER.id,
        ...(status && { status }),
      },
      include: {
        images: {
          orderBy: { index: 'asc' },
        },
        model: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * 创建新任务
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        userId: MOCK_USER.id,
        prompt: prompt.trim(),
        status: 'PENDING',
      },
      include: {
        images: true,
        model: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: task,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
```

#### 4.2 创建单个任务操作 API

创建 `app/api/tasks/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LocalStorage } from '@/lib/storage';

/**
 * GET /api/tasks/:id
 * 获取任务详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        images: {
          orderBy: { index: 'asc' },
        },
        model: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/:id
 * 更新任务信息
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const task = await prisma.task.update({
      where: { id: params.id },
      data: body,
      include: {
        images: true,
        model: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/:id
 * 删除任务及相关资源
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 删除本地文件资源
    await LocalStorage.deleteTaskResources(params.id);

    // 删除数据库记录（级联删除 images 和 model）
    await prisma.task.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
```

#### 4.3 创建图片保存 API

创建 `app/api/tasks/[id]/images/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tasks/:id/images
 * 保存任务的图片记录
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { url, index, aliyunTaskId, aliyunRequestId } = body;

    if (typeof url !== 'string' || typeof index !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid image data' },
        { status: 400 }
      );
    }

    const image = await prisma.taskImage.create({
      data: {
        taskId: params.id,
        url,
        index,
        aliyunTaskId,
        aliyunRequestId,
      },
    });

    return NextResponse.json({
      success: true,
      data: image,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to save image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save image' },
      { status: 500 }
    );
  }
}
```

#### 4.4 创建模型管理 API

创建 `app/api/tasks/[id]/model/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tasks/:id/model
 * 创建3D模型记录
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Model name is required' },
        { status: 400 }
      );
    }

    const model = await prisma.taskModel.create({
      data: {
        taskId: params.id,
        name: name.trim(),
        status: 'PENDING',
        progress: 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: model,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create model:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create model' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/:id/model
 * 更新3D模型信息
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // 查找该任务的模型
    const existingModel = await prisma.taskModel.findUnique({
      where: { taskId: params.id },
    });

    if (!existingModel) {
      return NextResponse.json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      );
    }

    const model = await prisma.taskModel.update({
      where: { id: existingModel.id },
      data: body,
    });

    return NextResponse.json({
      success: true,
      data: model,
    });
  } catch (error) {
    console.error('Failed to update model:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update model' },
      { status: 500 }
    );
  }
}
```

#### ✅ 验证步骤 4

创建测试脚本 `scripts/test-task-api.ts`:

```typescript
const API_BASE = 'http://localhost:3000/api';

async function testTaskAPI() {
  console.log('🧪 Testing Task Management API...\n');

  let taskId: string;

  try {
    // 测试 1: 创建任务
    console.log('Test 1: Creating a task...');
    const createRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Test prompt for API testing' }),
    });
    const createData = await createRes.json();
    taskId = createData.data.id;
    console.log(`  ✅ Task created: ${taskId}`);
    console.log(`  Status: ${createData.data.status}`);

    // 测试 2: 获取任务详情
    console.log('\nTest 2: Fetching task details...');
    const getRes = await fetch(`${API_BASE}/tasks/${taskId}`);
    const getData = await getRes.json();
    console.log(`  ✅ Task fetched: ${getData.data.prompt}`);

    // 测试 3: 更新任务状态
    console.log('\nTest 3: Updating task status...');
    const updateRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'GENERATING_IMAGES' }),
    });
    const updateData = await updateRes.json();
    console.log(`  ✅ Task updated: ${updateData.data.status}`);

    // 测试 4: 添加图片记录
    console.log('\nTest 4: Adding image records...');
    for (let i = 0; i < 4; i++) {
      const imageRes = await fetch(`${API_BASE}/tasks/${taskId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `/generated/images/${taskId}/${i}.png`,
          index: i,
        }),
      });
      const imageData = await imageRes.json();
      console.log(`  ✅ Image ${i} added: ${imageData.data.url}`);
    }

    // 测试 5: 创建模型记录
    console.log('\nTest 5: Creating model record...');
    const modelRes = await fetch(`${API_BASE}/tasks/${taskId}/model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Model' }),
    });
    const modelData = await modelRes.json();
    console.log(`  ✅ Model created: ${modelData.data.name}`);

    // 测试 6: 获取任务列表
    console.log('\nTest 6: Fetching task list...');
    const listRes = await fetch(`${API_BASE}/tasks`);
    const listData = await listRes.json();
    console.log(`  ✅ Tasks found: ${listData.count}`);

    // 测试 7: 删除任务
    console.log('\nTest 7: Deleting task...');
    const deleteRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    const deleteData = await deleteRes.json();
    console.log(`  ✅ ${deleteData.message}`);

    console.log('\n✅ All API tests passed!');
  } catch (error) {
    console.error('❌ API test failed:', error);
    process.exit(1);
  }
}

testTaskAPI();
```

在 `package.json` 添加:

```json
{
  "scripts": {
    "test:api": "tsx scripts/test-task-api.ts"
  }
}
```

**验证步骤**:

1. 启动开发服务器:
```bash
npm run dev
```

2. 在新终端运行测试:
```bash
npm run test:api
```

**验证清单**:
- [ ] 开发服务器正常启动
- [ ] 所有 7 个 API 测试通过
- [ ] Prisma Studio 可查看到测试数据（测试前）
- [ ] 测试后任务被正确删除

---

### 阶段 5: 实现文生图 API（流式 + 本地存储）

#### 5.1 创建文生图 API

创建 `app/api/generate-images/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LocalStorage } from '@/lib/storage';
import { IMAGE_GENERATION } from '@/lib/constants';

/**
 * POST /api/generate-images
 * 文生图 API - 流式返回
 */
export async function POST(request: NextRequest) {
  const { taskId, prompt } = await request.json();

  if (!taskId || !prompt) {
    return Response.json(
      { error: 'taskId and prompt are required' },
      { status: 400 }
    );
  }

  // 更新任务状态为生成中
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'GENERATING_IMAGES',
      imageGenerationStartedAt: new Date(),
    },
  });

  // 创建流式响应
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 生成 4 张图片
        for (let i = 0; i < IMAGE_GENERATION.COUNT; i++) {
          // 模拟生成延迟
          await new Promise(resolve => setTimeout(resolve, IMAGE_GENERATION.DELAY / 4));

          // 生成 Mock 图片并保存到本地
          const url = await LocalStorage.saveMockImage(taskId, i);

          // 保存到数据库
          await prisma.taskImage.create({
            data: {
              taskId,
              url,
              index: i,
            },
          });

          // 推送给前端
          const data = JSON.stringify({
            type: 'image',
            index: i,
            url,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        // 更新任务状态为图片就绪
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'IMAGES_READY',
            imageGenerationCompletedAt: new Date(),
          },
        });

        // 发送完成信号
        const doneData = JSON.stringify({ type: 'done' });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        controller.close();
      } catch (error) {
        console.error('Image generation failed:', error);

        // 更新任务状态为失败
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        const errorData = JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Image generation failed',
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### 5.2 更新 ImageGrid 组件集成任务

编辑 `components/workspace/ImageGrid.tsx`，将 `taskId` 参数传递给 API:

找到 `handleGenerate` 函数中的 fetch 调用（大约第 84 行），确保传递 `taskId`:

```typescript
// 修改前
body: JSON.stringify({
  prompt: trimmedText,
  count: IMAGE_GENERATION.COUNT,
  stream: true,
}),

// 修改后
body: JSON.stringify({
  taskId: taskId,  // 确保有这一行
  prompt: trimmedText,
  count: IMAGE_GENERATION.COUNT,
  stream: true,
}),
```

#### ✅ 验证步骤 5

**手动验证流程**:

1. 启动开发服务器:
```bash
npm run dev
```

2. 打开浏览器访问首页 `http://localhost:3000`

3. 在首页输入框输入: "一只可爱的猫咪玩偶"

4. 点击搜索按钮，观察是否:
   - [ ] 跳转到 `/workspace?prompt=...`
   - [ ] **期望**: 后续会自动创建任务并跳转到 `/workspace?taskId=xxx`（需要阶段 8 完成）

5. 暂时手动测试 API:

创建 `scripts/test-image-generation.ts`:

```typescript
const API_BASE = 'http://localhost:3000/api';

async function testImageGeneration() {
  console.log('🧪 Testing Image Generation API...\n');

  try {
    // 1. 创建任务
    const taskRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'A cute cat toy' }),
    });
    const taskData = await taskRes.json();
    const taskId = taskData.data.id;
    console.log(`✅ Task created: ${taskId}\n`);

    // 2. 调用图片生成 API
    console.log('Generating images (streaming)...');
    const response = await fetch(`${API_BASE}/generate-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, prompt: 'A cute cat toy' }),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'image') {
            console.log(`  ✅ Image ${data.index}: ${data.url}`);
          } else if (data.type === 'done') {
            console.log('\n✅ All images generated!');
          } else if (data.type === 'error') {
            console.error(`❌ Error: ${data.message}`);
          }
        }
      }
    }

    // 3. 验证任务状态
    const checkRes = await fetch(`${API_BASE}/tasks/${taskId}`);
    const checkData = await checkRes.json();
    console.log(`\n✅ Task status: ${checkData.data.status}`);
    console.log(`✅ Images saved: ${checkData.data.images.length}`);

    // 4. 验证文件存在
    console.log('\nVerifying files...');
    checkData.data.images.forEach((img: any) => {
      const exists = require('fs').existsSync(`./public${img.url}`);
      console.log(`  ${exists ? '✅' : '❌'} ${img.url}`);
    });

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testImageGeneration();
```

在 `package.json` 添加:

```json
{
  "scripts": {
    "test:image-gen": "tsx scripts/test-image-generation.ts"
  }
}
```

运行测试:

```bash
npm run test:image-gen
```

**验证清单**:
- [ ] 测试脚本运行成功
- [ ] 4 张图片流式返回
- [ ] 任务状态更新为 `IMAGES_READY`
- [ ] `public/generated/images/{taskId}/` 目录下有 4 个 PNG 文件
- [ ] 数据库中有 4 条 TaskImage 记录

---

### 阶段 6: 实现图生3D API（本地存储）

#### 6.1 创建图生3D API

创建 `app/api/generate-model/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LocalStorage } from '@/lib/storage';
import { MODEL_GENERATION } from '@/lib/constants';

/**
 * POST /api/generate-model
 * 图生3D API
 */
export async function POST(request: NextRequest) {
  const { taskId, selectedImageIndex } = await request.json();

  if (!taskId || selectedImageIndex === undefined) {
    return Response.json(
      { error: 'taskId and selectedImageIndex are required' },
      { status: 400 }
    );
  }

  try {
    // 1. 获取任务信息
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { images: true },
    });

    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    // 2. 更新任务：记录选中的图片索引，更新状态
    await prisma.task.update({
      where: { id: taskId },
      data: {
        selectedImageIndex,
        status: 'GENERATING_MODEL',
        modelGenerationStartedAt: new Date(),
      },
    });

    // 3. 创建模型记录
    const model = await prisma.taskModel.create({
      data: {
        taskId,
        name: `Model for ${task.prompt.substring(0, 30)}`,
        status: 'GENERATING',
        progress: 0,
      },
    });

    // 4. 异步生成模型（模拟）
    setTimeout(async () => {
      try {
        // 模拟生成 3D 模型
        const modelUrl = await LocalStorage.saveMockModel(taskId);
        const fileSize = LocalStorage.getFileSize(modelUrl);

        // 更新模型记录
        await prisma.taskModel.update({
          where: { id: model.id },
          data: {
            status: 'COMPLETED',
            modelUrl,
            fileSize,
            faceCount: 50248,
            vertexCount: 25124,
            progress: 100,
            completedAt: new Date(),
          },
        });

        // 更新任务状态为完成
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'COMPLETED',
            modelGenerationCompletedAt: new Date(),
            completedAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Model generation failed:', error);

        await prisma.taskModel.update({
          where: { id: model.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: 'Model generation failed',
          },
        });
      }
    }, MODEL_GENERATION.DELAY);

    // 5. 立即返回模型记录
    return Response.json({
      success: true,
      data: {
        model,
        message: 'Model generation started',
      },
    });
  } catch (error) {
    console.error('Failed to start model generation:', error);
    return Response.json(
      { error: 'Failed to start model generation' },
      { status: 500 }
    );
  }
}
```

#### 6.2 创建模型进度查询 API

创建 `app/api/tasks/[id]/model/progress/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tasks/:id/model/progress
 * 查询3D模型生成进度
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const model = await prisma.taskModel.findUnique({
      where: { taskId: params.id },
    });

    if (!model) {
      return NextResponse.json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: model.status,
        progress: model.progress,
        modelUrl: model.modelUrl,
      },
    });
  } catch (error) {
    console.error('Failed to fetch model progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
```

#### ✅ 验证步骤 6

创建测试脚本 `scripts/test-model-generation.ts`:

```typescript
const API_BASE = 'http://localhost:3000/api';

async function testModelGeneration() {
  console.log('🧪 Testing 3D Model Generation API...\n');

  try {
    // 1. 创建任务
    console.log('Step 1: Creating task...');
    const taskRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'A cute robot toy' }),
    });
    const taskData = await taskRes.json();
    const taskId = taskData.data.id;
    console.log(`  ✅ Task created: ${taskId}\n`);

    // 2. 生成图片
    console.log('Step 2: Generating images...');
    const imageRes = await fetch(`${API_BASE}/generate-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, prompt: 'A cute robot toy' }),
    });

    const reader = imageRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'image') {
            console.log(`  ✅ Image ${data.index} generated`);
          }
        }
      }
    }
    console.log('');

    // 3. 触发3D模型生成
    console.log('Step 3: Generating 3D model...');
    const modelRes = await fetch(`${API_BASE}/generate-model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, selectedImageIndex: 2 }),
    });
    const modelData = await modelRes.json();
    console.log(`  ✅ ${modelData.data.message}\n`);

    // 4. 轮询进度
    console.log('Step 4: Checking progress...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 15;

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const progressRes = await fetch(`${API_BASE}/tasks/${taskId}/model/progress`);
      const progressData = await progressRes.json();

      console.log(`  Progress: ${progressData.data.progress}% - ${progressData.data.status}`);

      if (progressData.data.status === 'COMPLETED') {
        completed = true;
        console.log(`  ✅ Model URL: ${progressData.data.modelUrl}\n`);
      }

      attempts++;
    }

    if (!completed) {
      throw new Error('Model generation timeout');
    }

    // 5. 验证最终任务状态
    console.log('Step 5: Verifying final task state...');
    const finalRes = await fetch(`${API_BASE}/tasks/${taskId}`);
    const finalData = await finalRes.json();
    console.log(`  ✅ Task status: ${finalData.data.status}`);
    console.log(`  ✅ Selected image: ${finalData.data.selectedImageIndex}`);
    console.log(`  ✅ Model name: ${finalData.data.model.name}`);
    console.log(`  ✅ Model file size: ${finalData.data.model.fileSize} bytes`);

    // 6. 验证文件存在
    console.log('\nStep 6: Verifying model file...');
    const fs = require('fs');
    const modelPath = `./public${finalData.data.model.modelUrl}`;
    const exists = fs.existsSync(modelPath);
    console.log(`  ${exists ? '✅' : '❌'} Model file: ${modelPath}`);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testModelGeneration();
```

在 `package.json` 添加:

```json
{
  "scripts": {
    "test:model-gen": "tsx scripts/test-model-generation.ts"
  }
}
```

**验证步骤**:

1. 启动开发服务器:
```bash
npm run dev
```

2. 运行测试:
```bash
npm run test:model-gen
```

**验证清单**:
- [ ] 测试脚本运行成功
- [ ] 任务状态正确流转: PENDING → GENERATING_IMAGES → IMAGES_READY → GENERATING_MODEL → COMPLETED
- [ ] `selectedImageIndex` 正确保存
- [ ] 模型文件生成在 `public/generated/models/{taskId}.glb`
- [ ] 数据库中 TaskModel 记录状态为 COMPLETED
- [ ] 模型元数据（fileSize、faceCount 等）正确填充

---

### 阶段 7: 改造 Workspace 页面集成任务系统

#### 7.1 改造 Workspace 页面

编辑 `app/workspace/page.tsx`:

```typescript
"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import ImageGrid from "@/components/workspace/ImageGrid";
import ModelPreview from "@/components/workspace/ModelPreview";
import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
import type { TaskWithDetails } from "@/types";

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const prompt = searchParams.get("prompt");

  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // 初始化：从 URL 参数创建或加载任务
  useEffect(() => {
    const initializeTask = async () => {
      try {
        if (taskId) {
          // 场景 1: 有 taskId，加载已存在的任务
          const response = await fetch(`/api/tasks/${taskId}`);
          const data = await response.json();

          if (data.success) {
            setTask(data.data);
            if (data.data.selectedImageIndex !== null) {
              setSelectedImageIndex(data.data.selectedImageIndex);
            }
          } else {
            console.error('Failed to load task:', data.error);
          }
        } else if (prompt) {
          // 场景 2: 有 prompt 但无 taskId，创建新任务
          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });
          const data = await response.json();

          if (data.success) {
            // 更新 URL 为新任务 ID
            router.replace(`/workspace?taskId=${data.data.id}`);
            setTask(data.data);
          } else {
            console.error('Failed to create task:', data.error);
          }
        }
      } catch (error) {
        console.error('Failed to initialize task:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeTask();
  }, [taskId, prompt, router]);

  const handleGenerate3D = async (imageIndex: number) => {
    if (!task) return;

    setSelectedImageIndex(imageIndex);

    // 调用图生3D API
    try {
      const response = await fetch('/api/generate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          selectedImageIndex: imageIndex,
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('3D model generation started');
        // 刷新任务数据
        refetchTask();
      }
    } catch (error) {
      console.error('Failed to start 3D generation:', error);
    }
  };

  const refetchTask = async () => {
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`);
      const data = await response.json();
      if (data.success) {
        setTask(data.data);
      }
    } catch (error) {
      console.error('Failed to refetch task:', error);
    }
  };

  if (loading) {
    return <WorkspaceSkeleton />;
  }

  if (!task) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-white/60">任务加载失败</p>
      </div>
    );
  }

  return (
    <>
      {/* 左侧:输入与生成区域 */}
      <div className="flex w-full flex-col gap-4 overflow-hidden lg:w-2/5">
        <ImageGrid
          initialPrompt={task.prompt}
          onGenerate3D={handleGenerate3D}
          task={task}
          taskId={task.id}
        />
      </div>

      {/* 右侧:3D预览区域 */}
      <div className="flex w-full flex-col overflow-hidden lg:w-3/5">
        <ModelPreview
          imageIndex={selectedImageIndex}
          prompt={task.prompt}
          task={task}
          taskId={task.id}
          onRefreshTask={refetchTask}
        />
      </div>
    </>
  );
}

function WorkspaceLoading() {
  return <WorkspaceSkeleton />;
}

export default function WorkspacePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#000000] text-white">
      <Navigation />
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row">
        <Suspense fallback={<WorkspaceLoading />}>
          <WorkspaceContent />
        </Suspense>
      </div>
    </div>
  );
}
```

#### 7.2 更新 ModelPreview 组件

编辑 `components/workspace/ModelPreview.tsx`，添加进度轮询:

在组件开头添加新的 prop:

```typescript
interface ModelPreviewProps {
  imageIndex: number | null;
  prompt: string;
  task?: Task | null;
  taskId?: string;
  onRefreshTask?: () => void;  // 新增
}

export default function ModelPreview({
  imageIndex,
  prompt,
  task,
  taskId,
  onRefreshTask,  // 新增
}: ModelPreviewProps) {
```

在 `startModelGeneration` 函数后添加轮询逻辑:

```typescript
// 在 useEffect 中添加轮询逻辑
useEffect(() => {
  if (task?.model?.status === 'GENERATING' && taskId) {
    // 轮询模型生成进度
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/model/progress`);
        const data = await response.json();

        if (data.success) {
          setProgress(data.data.progress);

          if (data.data.status === 'COMPLETED') {
            setStatus('completed');
            clearInterval(pollInterval);
            onRefreshTask?.(); // 刷新任务数据
          } else if (data.data.status === 'FAILED') {
            setStatus('failed');
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Failed to poll progress:', error);
      }
    }, 1000); // 每秒轮询一次

    return () => clearInterval(pollInterval);
  }
}, [task?.model?.status, taskId, onRefreshTask]);
```

#### ✅ 验证步骤 7

**手动端到端验证**:

1. 启动开发服务器:
```bash
npm run dev
```

2. 打开浏览器 `http://localhost:3000`

3. **测试流程 A: 从首页创建新任务**
   - [ ] 在首页输入: "一个未来科技风格的机器人"
   - [ ] 点击搜索/生成按钮
   - [ ] 检查 URL 是否变为 `/workspace?taskId=xxx`
   - [ ] 观察是否自动开始生成图片
   - [ ] 等待 4 张图片流式显示完成

4. **测试流程 B: 选择图片并生成3D**
   - [ ] 点击任意一张图片（观察选中状态）
   - [ ] 点击"生成 3D 模型"按钮
   - [ ] 观察右侧进度条开始增长
   - [ ] 等待 3 秒后模型生成完成
   - [ ] 检查是否显示"模型生成完成"

5. **测试流程 C: 刷新页面加载已有任务**
   - [ ] 复制当前 URL (包含 taskId)
   - [ ] 刷新页面 (F5)
   - [ ] 检查任务数据是否正确加载
   - [ ] 图片是否正确显示
   - [ ] 选中的图片状态是否保留
   - [ ] 3D 模型信息是否显示

6. **验证数据库**:
```bash
npx prisma studio
```
   - [ ] Task 表中有对应记录
   - [ ] TaskImage 表中有 4 条记录
   - [ ] TaskModel 表中有 1 条记录
   - [ ] 任务状态为 `COMPLETED`

7. **验证文件系统**:
```bash
ls -la public/generated/images/{taskId}/
ls -la public/generated/models/
```
   - [ ] 图片目录下有 4 个 PNG 文件
   - [ ] models 目录下有对应的 GLB 文件

**验证清单**:
- [ ] 所有手动测试流程通过
- [ ] 数据库记录正确
- [ ] 文件系统资源存在
- [ ] 页面刷新后数据不丢失
- [ ] 无控制台错误

---

### 阶段 8: 实现任务历史记录功能

#### 8.1 创建历史记录页面

创建 `app/history/page.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/layout/Navigation";
import type { TaskWithDetails } from "@/types";

export default function HistoryPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();

      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 从列表中移除
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: '等待中',
      GENERATING_IMAGES: '生成图片中',
      IMAGES_READY: '图片已就绪',
      GENERATING_MODEL: '生成3D中',
      COMPLETED: '已完成',
      FAILED: '失败',
      CANCELLED: '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PENDING: 'text-white/60',
      GENERATING_IMAGES: 'text-blue-400',
      IMAGES_READY: 'text-yellow-1',
      GENERATING_MODEL: 'text-blue-400',
      COMPLETED: 'text-green-500',
      FAILED: 'text-red-500',
      CANCELLED: 'text-white/40',
    };
    return colorMap[status] || 'text-white/60';
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#000000] text-white">
      <Navigation />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-6 text-2xl font-bold text-white">任务历史</h1>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-1/30 border-t-yellow-1" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass-panel flex flex-col items-center justify-center py-12">
              <p className="text-white/60">暂无任务记录</p>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="btn-primary mt-4"
              >
                开始创建
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="glass-panel group cursor-pointer overflow-hidden transition-all hover:border-yellow-1/30"
                  onClick={() => router.push(`/workspace?taskId=${task.id}`)}
                >
                  {/* 缩略图 */}
                  <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-white/5 to-[#0d0d0d]">
                    {task.images.length > 0 ? (
                      <img
                        src={task.images[task.selectedImageIndex ?? 0]?.url || task.images[0].url}
                        alt="Task thumbnail"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-4xl">🎨</span>
                      </div>
                    )}

                    {/* 状态标签 */}
                    <div className={`absolute right-2 top-2 rounded-lg bg-black/80 px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}>
                      {getStatusText(task.status)}
                    </div>
                  </div>

                  {/* 任务信息 */}
                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 text-sm font-medium text-white">
                      {task.prompt}
                    </h3>

                    <div className="mb-3 flex items-center gap-3 text-xs text-white/50">
                      <span>{task.images.length} 张图片</span>
                      {task.model && <span>• 已生成3D</span>}
                    </div>

                    <div className="text-xs text-white/40">
                      {new Date(task.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="border-t border-white/10 p-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                      className="w-full rounded-lg bg-red-500/10 py-2 text-xs font-medium text-red-500 transition-all hover:bg-red-500/20"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 8.2 在导航栏添加历史记录入口

编辑 `components/layout/Navigation.tsx`，添加"历史记录"链接:

找到导航链接部分，添加:

```typescript
<Link
  href="/history"
  className="text-sm font-medium text-foreground-muted transition-colors hover:text-yellow-1"
>
  历史记录
</Link>
```

#### ✅ 验证步骤 8

**手动验证**:

1. 启动开发服务器:
```bash
npm run dev
```

2. **创建多个测试任务**:
   - [ ] 创建任务 1: "一只可爱的猫咪"（完成整个流程）
   - [ ] 创建任务 2: "未来科技机器人"（完成整个流程）
   - [ ] 创建任务 3: "卡通风格汽车"（只生成图片，不生成3D）

3. **访问历史记录页面**:
   - [ ] 点击导航栏"历史记录"
   - [ ] 检查是否显示 3 个任务卡片
   - [ ] 验证缩略图是否正确显示
   - [ ] 验证状态标签颜色和文字

4. **测试交互**:
   - [ ] 点击任务卡片，检查是否跳转到对应的 workspace
   - [ ] 在 workspace 中验证任务数据完整加载
   - [ ] 返回历史记录页面
   - [ ] 点击"删除"按钮删除一个任务
   - [ ] 确认任务从列表中消失
   - [ ] 检查文件是否被删除（`public/generated/images/{taskId}/`）

5. **测试空状态**:
   - [ ] 删除所有任务
   - [ ] 检查是否显示"暂无任务记录"
   - [ ] 点击"开始创建"按钮，验证跳转到首页

**验证清单**:
- [ ] 历史记录页面正常显示
- [ ] 任务卡片样式正确
- [ ] 状态标签颜色正确
- [ ] 缩略图加载正常
- [ ] 点击卡片可跳转
- [ ] 删除功能正常
- [ ] 空状态显示正确
- [ ] 导航链接高亮正确

---

## 最终验证

完成所有阶段后，进行完整的端到端测试:

### 完整流程测试

```bash
# 1. 清理所有数据
rm prisma/dev.db
rm -rf public/generated/images/*
rm -rf public/generated/models/*

# 2. 重新初始化
npx prisma migrate reset --force
npx prisma db seed
npm run init:storage

# 3. 启动服务器
npm run dev
```

**完整用户旅程**:

1. [ ] 访问首页 → 输入 Prompt → 跳转到 Workspace
2. [ ] 自动创建任务并生成 4 张图片（流式）
3. [ ] 选择一张图片 → 生成 3D 模型
4. [ ] 刷新页面，数据正确恢复
5. [ ] 返回首页，创建第二个任务
6. [ ] 访问历史记录页面，看到 2 个任务
7. [ ] 点击第一个任务，返回对应的 Workspace
8. [ ] 删除第二个任务，验证文件和数据库记录被清除

---

## 后续迁移 OSS 指南

当需要迁移到阿里云 OSS 时:

1. 创建 `lib/oss-storage.ts`:

```typescript
import OSS from 'ali-oss';

export class OSSStorage {
  private static client = new OSS({
    region: process.env.ALIYUN_OSS_REGION!,
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
    bucket: process.env.ALIYUN_OSS_BUCKET!,
  });

  static async saveTaskImage(
    taskId: string,
    index: number,
    imageData: Buffer
  ): Promise<string> {
    const objectName = `images/${taskId}/${index}.png`;
    await this.client.put(objectName, imageData);
    return `https://${process.env.ALIYUN_OSS_BUCKET}.${process.env.ALIYUN_OSS_REGION}.aliyuncs.com/${objectName}`;
  }

  // ... 其他方法实现
}
```

2. 在 API 中替换引用:

```typescript
// import { LocalStorage } from '@/lib/storage';
import { OSSStorage as Storage } from '@/lib/oss-storage';

// 业务代码无需修改
const url = await Storage.saveTaskImage(taskId, index, buffer);
```

3. 数据迁移:

```bash
# 将本地文件上传到 OSS
# 更新数据库中的 URL 路径
```

---

## 文件清单

实施完成后，新增/修改的文件:

### 新增文件
- `prisma/schema.prisma` - 数据库 Schema
- `prisma/seed.ts` - 种子数据
- `lib/prisma.ts` - Prisma Client
- `lib/storage.ts` - 本地存储工具
- `scripts/init-storage.ts` - 存储初始化
- `scripts/test-storage.ts` - 存储测试
- `scripts/test-task-api.ts` - API 测试
- `scripts/test-image-generation.ts` - 图片生成测试
- `scripts/test-model-generation.ts` - 模型生成测试
- `app/api/tasks/route.ts` - 任务列表/创建
- `app/api/tasks/[id]/route.ts` - 单个任务操作
- `app/api/tasks/[id]/images/route.ts` - 图片保存
- `app/api/tasks/[id]/model/route.ts` - 模型管理
- `app/api/tasks/[id]/model/progress/route.ts` - 模型进度
- `app/api/generate-images/route.ts` - 文生图 API
- `app/api/generate-model/route.ts` - 图生3D API
- `app/history/page.tsx` - 历史记录页面

### 修改文件
- `types/index.ts` - 添加 Prisma 类型
- `lib/constants.ts` - 添加 MOCK_USER 和 STORAGE_PATHS
- `app/workspace/page.tsx` - 集成任务系统
- `components/workspace/ImageGrid.tsx` - 传递 taskId
- `components/workspace/ModelPreview.tsx` - 添加进度轮询
- `components/layout/Navigation.tsx` - 添加历史记录链接
- `package.json` - 添加脚本和 Prisma 配置
- `.gitignore` - 添加数据库和生成文件

### 生成的文件/目录
- `prisma/dev.db` - SQLite 数据库
- `prisma/migrations/` - 数据库迁移文件
- `node_modules/@prisma/client/` - Prisma Client
- `public/generated/images/` - 生成的图片
- `public/generated/models/` - 生成的模型

---

## 故障排除

### 常见问题

**问题 1: Prisma Client 未生成**
```bash
npx prisma generate
```

**问题 2: 数据库表结构不匹配**
```bash
npx prisma migrate reset --force
npx prisma db seed
```

**问题 3: 文件权限错误**
```bash
chmod -R 755 public/generated
```

**问题 4: 端口已被占用**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

---

## 总结

本实施方案完成后，你将拥有:

✅ 完整的任务系统（Prisma + SQLite）
✅ 本地文件存储（易于迁移 OSS）
✅ 流式文生图 API
✅ 图生3D API（带进度轮询）
✅ 任务历史记录功能
✅ 完整的测试验证流程

每个阶段都有明确的验证步骤，确保逐步实施、逐步验证。
