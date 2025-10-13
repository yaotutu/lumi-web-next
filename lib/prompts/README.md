# 提示词管理

## 目录结构

```
lib/prompts/
├── index.ts              # 统一导出
├── image-3d-print.ts     # 3D打印图片优化提示词
└── README.md             # 本文档
```

## 使用方法

### 使用现有提示词

```typescript
import { IMAGE_3D_PRINT_PROMPT } from "@/lib/prompts";

// 使用提示词
const result = await someAPI(IMAGE_3D_PRINT_PROMPT);
```

## 添加新提示词

### 步骤 1: 创建提示词文件

创建 `lib/prompts/your-prompt-name.ts`:

```typescript
/**
 * 您的提示词描述
 */
export const YOUR_PROMPT_NAME = `这里是提示词内容
可以使用多行
无需转义换行符`;
```

### 步骤 2: 在 index.ts 中导出

在 `lib/prompts/index.ts` 中添加:

```typescript
export { IMAGE_3D_PRINT_PROMPT } from "./image-3d-print";
export { YOUR_PROMPT_NAME } from "./your-prompt-name";  // 新增这行
```

### 步骤 3: 使用新提示词

```typescript
import { YOUR_PROMPT_NAME } from "@/lib/prompts";

const result = await someAPI(YOUR_PROMPT_NAME);
```

## 提示词列表

| 提示词常量 | 文件 | 用途 |
|-----------|------|------|
| `IMAGE_3D_PRINT_PROMPT` | `image-3d-print.ts` | 3D打印图片优化 |

## 编辑提示词

直接编辑对应的 `.ts` 文件即可,使用模板字符串支持多行,无需转义。

**示例**:

```typescript
export const IMAGE_3D_PRINT_PROMPT = `你是一个专业助手。

这里可以随意换行
不需要 \n

支持:
- 列表
- 多行
- 任意格式`;
```

## 注意事项

1. ✅ 使用**模板字符串**(\`\`),支持原生多行
2. ✅ 每个提示词**独立文件**,便于管理
3. ✅ 修改后**自动生效**,无需重启(开发模式)
4. ✅ 支持**版本控制**,Git diff 清晰

## 最佳实践

### 命名规范

- 文件名: `kebab-case.ts` (如: `image-3d-print.ts`)
- 常量名: `UPPER_SNAKE_CASE` (如: `IMAGE_3D_PRINT_PROMPT`)

### 文档注释

每个提示词文件顶部添加 JSDoc 注释:

```typescript
/**
 * 提示词用途说明
 * @version 1.0.0
 * @author 作者名
 */
export const PROMPT_NAME = `...`;
```

### 版本管理

如果提示词内容有重大变更,建议:

1. 在注释中标注版本号
2. 提交 Git 时写清楚改动原因
3. 必要时保留旧版本(如: `image-3d-print-v1.ts`)

## 示例

### 完整示例: 添加模型生成提示词

**步骤 1**: 创建 `lib/prompts/model-generation.ts`

```typescript
/**
 * 3D模型生成提示词
 * 用于图生3D的提示词优化
 */
export const MODEL_GENERATION_PROMPT = `你是一个3D模型生成助手。

用户会提供一张图片,你需要分析图片特征,生成适合3D建模的描述。

要求:
1. 识别物体类型和形状
2. 分析结构复杂度
3. 评估3D打印可行性

输出格式:
- 物体描述(中英文)
- 建议的建模方式
- 打印难度评级`;
```

**步骤 2**: 在 `lib/prompts/index.ts` 中添加

```typescript
export { IMAGE_3D_PRINT_PROMPT } from "./image-3d-print";
export { MODEL_GENERATION_PROMPT } from "./model-generation";
```

**步骤 3**: 使用

```typescript
import { MODEL_GENERATION_PROMPT } from "@/lib/prompts";

const result = await optimizeWithAI(image, MODEL_GENERATION_PROMPT);
```

## 故障排查

### 问题: 导入提示词时 TypeScript 报错

**解决**: 确保在 `index.ts` 中正确导出了该提示词。

### 问题: 修改提示词后不生效

**解决**:
- 开发模式: 刷新浏览器
- 生产模式: 重新构建 `npm run build`
