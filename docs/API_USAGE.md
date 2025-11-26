# API 快速上手指南

Lumi Web Next API 使用指南，帮助你快速上手。

---

## 📖 查看完整 API 文档

### 方式 1：本地 Swagger UI（推荐）

启动开发服务器后，访问：

```
http://localhost:4100/api-docs
```

**优势**：
- ✅ 交互式文档，可以直接测试 API
- ✅ 自动显示请求/响应格式
- ✅ 支持搜索和过滤

### 方式 2：在线 Swagger Editor

1. 访问 https://editor.swagger.io
2. 点击 `File` → `Import file`
3. 选择 `docs/openapi.yaml`

### 方式 3：VS Code 插件

1. 安装插件：`OpenAPI (Swagger) Editor`
2. 打开 `docs/openapi.yaml`
3. 右键选择 `Preview Swagger`

---

## 🚀 快速开始

### 1. 认证流程（邮箱验证码登录）

```bash
# 步骤 1: 发送验证码
curl -X POST http://localhost:4100/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 响应
{
  "success": true,
  "message": "验证码已发送，请查收（开发环境请使用 0000）"
}

# 步骤 2: 验证码登录（开发环境验证码固定为 0000）
curl -X POST http://localhost:4100/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "0000"}' \
  -c cookies.txt  # 保存 Cookie

# 响应
{
  "success": true,
  "data": {
    "user": {
      "id": "clxxxx1234567890",
      "email": "test@example.com",
      "name": null,
      "createdAt": "2025-01-21T12:00:00Z"
    },
    "message": "登录成功"
  }
}

# 步骤 3: 验证登录状态
curl http://localhost:4100/api/auth/me \
  -b cookies.txt  # 使用保存的 Cookie

# 响应
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

### 2. 创建生成任务（文本生成图片）

```bash
# 需要登录
curl -X POST http://localhost:4100/api/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"prompt": "一只可爱的小猫"}'

# 响应（201 Created）
{
  "success": true,
  "data": {
    "id": "clxxxx1234567890",
    "prompt": "一只可爱的小猫",
    "createdAt": "2025-01-21T12:00:00Z",
    "images": [
      {
        "id": "img_001",
        "index": 0,
        "imageStatus": "PENDING",  # 初始状态
        "imageUrl": null
      },
      // ... 共 4 张图片
    ]
  },
  "message": "任务已创建，4个图片生成任务已启动"
}
```

### 3. 实时监听任务状态（SSE）

```javascript
// 客户端代码（浏览器）
const taskId = 'clxxxx1234567890';
const eventSource = new EventSource(`http://localhost:4100/api/tasks/${taskId}/events`);

// 监听图片生成完成事件
eventSource.addEventListener('image:completed', (e) => {
  const data = JSON.parse(e.data);
  console.log('图片完成:', data);
  // data = { imageId: "xxx", imageUrl: "https://...", index: 0 }
});

// 监听模型生成进度
eventSource.addEventListener('model:progress', (e) => {
  const data = JSON.parse(e.data);
  console.log('模型生成进度:', data.progress, '%');
});

// 监听模型生成完成
eventSource.addEventListener('model:completed', (e) => {
  const data = JSON.parse(e.data);
  console.log('模型完成:', data);
  // data = { modelId: "xxx", modelUrl: "https://...", previewImageUrl: "..." }
});

// 关闭连接
// eventSource.close();
```

### 4. 查询任务状态（轮询方式）

```bash
# 如果不使用 SSE，可以定时轮询任务状态
curl http://localhost:4100/api/tasks/clxxxx1234567890 \
  -b cookies.txt

# 响应
{
  "success": true,
  "data": {
    "id": "clxxxx1234567890",
    "prompt": "一只可爱的小猫",
    "images": [
      {
        "id": "img_001",
        "index": 0,
        "imageStatus": "COMPLETED",  # 已完成
        "imageUrl": "https://example.com/image1.png",
        "generationJob": {
          "status": "COMPLETED",
          "completedAt": "2025-01-21T12:05:00Z"
        }
      }
      // ...
    ]
  }
}
```

### 5. 选择图片生成 3D 模型

```bash
# 选择 index=0 的图片生成 3D 模型
curl -X PATCH http://localhost:4100/api/tasks/clxxxx1234567890 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"selectedImageIndex": 0}'

# 响应
{
  "success": true,
  "model": {
    "id": "model_001",
    "name": "一只可爱的小猫",
    "sourceImageId": "img_001",
    "modelUrl": null,  # 初始为 null，生成完成后更新
    "format": "OBJ",
    "generationJob": {
      "status": "PENDING",
      "progress": 0
    }
  },
  "selectedImageIndex": 0,
  "message": "3D模型生成已启动"
}
```

### 6. 获取模型画廊列表

```bash
# 无需登录
curl "http://localhost:4100/api/gallery/models?sortBy=latest&limit=20&offset=0"

# 响应
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "asset_001",
        "name": "可爱的小猫模型",
        "description": "AI 生成的 3D 小猫模型",
        "modelUrl": "https://example.com/model.glb",
        "previewImageUrl": "https://example.com/preview.png",
        "format": "GLB",
        "viewCount": 150,
        "downloadCount": 25,
        "createdAt": "2025-01-21T12:00:00Z"
      }
      // ...
    ],
    "total": 100,
    "hasMore": true
  }
}
```

---

## 🔑 认证说明

### Cookie 认证

- **Cookie 名称**：`auth-token`
- **类型**：JWT Token
- **有效期**：7 天
- **HttpOnly**：是（防止 XSS 攻击）
- **设置方式**：登录成功后自动设置

### 需要认证的 API

| 路径 | 需要认证 |
|------|--------|
| `/api/auth/*` | ❌ 无需认证 |
| `/api/tasks` (GET/POST) | ✅ 需要认证 |
| `/api/tasks/{id}/*` | ✅ 需要认证 |
| `/api/gallery/*` | ❌ 无需认证（公开） |
| `/api/proxy/*` | ❌ 无需认证 |
| `/api/admin/*` | ❌ 无需认证（内部使用） |
| `/api/test/*` | ❌ 无需认证（测试用） |

### 未认证响应

```json
{
  "success": false,
  "error": "未登录或登录已过期",
  "code": "UNAUTHORIZED"
}
```

---

## ⚠️ 错误处理

### 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": "错误描述（用户可读）",
  "code": "ERROR_CODE",
  "details": {}  // 可选，包含详细错误信息
}
```

### 常见错误代码

| 错误代码 | HTTP 状态码 | 说明 | 示例 |
|---------|-----------|------|------|
| `VALIDATION_ERROR` | 400 | 输入验证失败 | 缺少必需参数、格式错误 |
| `UNAUTHORIZED` | 401 | 未认证或认证失败 | 未登录、Token 过期 |
| `FORBIDDEN` | 403 | 无权访问 | 访问其他用户的资源 |
| `NOT_FOUND` | 404 | 资源不存在 | 任务 ID 不存在 |
| `INVALID_STATE` | 409 | 状态不允许操作 | 选择未完成的图片生成模型 |
| `EXTERNAL_API_ERROR` | 500 | 外部 API 错误 | 腾讯云 API 调用失败 |
| `UNKNOWN_ERROR` | 500 | 未知错误 | 服务器内部错误 |

### 错误示例

#### 输入验证错误（400）

```json
{
  "success": false,
  "error": "输入验证失败",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email"
    },
    {
      "path": ["prompt"],
      "message": "Required"
    }
  ]
}
```

#### 状态冲突（409）

```json
{
  "success": false,
  "error": "图片尚未生成完成，无法生成3D模型",
  "code": "INVALID_STATE"
}
```

---

## 🧪 快速测试

### 使用 Postman

1. 导入 `docs/openapi.yaml`：
   - 打开 Postman
   - `Import` → `File` → 选择 `openapi.yaml`
   - 自动生成所有 API 的请求模板

2. 设置环境变量：
   - `baseUrl`: `http://localhost:4100`
   - `email`: `test@example.com`

### 使用 curl（命令行）

```bash
# 完整流程测试脚本
# 1. 登录
curl -X POST http://localhost:4100/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "0000"}' \
  -c cookies.txt

# 2. 创建任务
TASK_ID=$(curl -X POST http://localhost:4100/api/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"prompt": "一只可爱的小猫"}' \
  | jq -r '.data.id')

echo "任务 ID: $TASK_ID"

# 3. 等待图片生成（轮询）
while true; do
  STATUS=$(curl -s http://localhost:4100/api/tasks/$TASK_ID -b cookies.txt \
    | jq -r '.data.images[0].imageStatus')
  echo "图片状态: $STATUS"

  if [ "$STATUS" = "COMPLETED" ]; then
    echo "图片生成完成！"
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo "图片生成失败"
    break
  fi

  sleep 5
done

# 4. 选择图片生成 3D 模型
curl -X PATCH http://localhost:4100/api/tasks/$TASK_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"selectedImageIndex": 0}'
```

### 使用 JavaScript（浏览器/Node.js）

```javascript
// 完整流程示例
async function testFullWorkflow() {
  // 1. 登录
  const loginRes = await fetch('http://localhost:4100/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // 自动处理 Cookie
    body: JSON.stringify({
      email: 'test@example.com',
      code: '0000'
    })
  });

  const { data: { user } } = await loginRes.json();
  console.log('登录成功:', user.email);

  // 2. 创建任务
  const createRes = await fetch('http://localhost:4100/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      prompt: '一只可爱的小猫'
    })
  });

  const { data: task } = await createRes.json();
  console.log('任务已创建:', task.id);

  // 3. 使用 SSE 监听状态
  const eventSource = new EventSource(
    `http://localhost:4100/api/tasks/${task.id}/events`
  );

  eventSource.addEventListener('image:completed', (e) => {
    const data = JSON.parse(e.data);
    console.log('图片完成:', data.index, data.imageUrl);

    // 第一张图片完成后，选择生成 3D 模型
    if (data.index === 0) {
      selectImageAndGenerateModel(task.id, 0);
    }
  });

  eventSource.addEventListener('model:progress', (e) => {
    const data = JSON.parse(e.data);
    console.log('模型生成进度:', data.progress, '%');
  });

  eventSource.addEventListener('model:completed', (e) => {
    const data = JSON.parse(e.data);
    console.log('模型完成:', data.modelUrl);
    eventSource.close();
  });
}

async function selectImageAndGenerateModel(taskId, imageIndex) {
  const res = await fetch(`http://localhost:4100/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      selectedImageIndex: imageIndex
    })
  });

  const { model } = await res.json();
  console.log('3D 模型生成已启动:', model.id);
}

// 运行测试
testFullWorkflow();
```

---

## 📊 API 分组

### 认证相关（4 个）
- `POST /api/auth/send-code` - 发送验证码
- `POST /api/auth/verify-code` - 验证码登录
- `GET /api/auth/me` - 获取当前用户
- `POST /api/auth/logout` - 退出登录

### 任务管理（8 个）
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务
- `GET /api/tasks/{id}` - 获取任务详情
- `PATCH /api/tasks/{id}` - 选择图片生成模型
- `GET /api/tasks/{id}/events` - SSE 实时推送
- `POST /api/tasks/{id}/print` - 提交打印任务
- `GET /api/tasks/{id}/print-status` - 查询打印状态

### 画廊（3 个）
- `GET /api/gallery/models` - 获取模型列表
- `GET /api/gallery/models/{id}` - 获取模型详情
- `POST /api/gallery/models/{id}/download` - 增加下载计数

### 代理服务（2 个）
- `GET /api/proxy/image?url=` - 图片代理（解决 CORS）
- `GET /api/proxy/model?url=` - 模型代理（解决 CORS）

### 管理接口（4 个）
- `GET /api/admin/queues/{name}` - 获取队列配置
- `PATCH /api/admin/queues/{name}` - 更新队列配置
- `POST /api/admin/queues/{name}/pause` - 暂停队列
- `DELETE /api/admin/queues/{name}/pause` - 恢复队列

### 测试接口（4 个）
- `GET /api/test/requests` - 获取请求列表（测试用）
- `POST /api/test/requests` - 创建请求（测试用）
- `GET /api/test/requests/{id}` - 获取请求详情（测试用）
- `POST /api/test/models/generate` - 创建模型生成任务（测试用）

### Worker 状态（1 个）
- `GET /api/workers/status` - 获取 Worker 运行状态

**总计：26 个 API 端点**

---

## 💡 提示

1. **开发环境验证码固定为 `0000`**，无需配置邮件服务
2. **使用 SSE 而非轮询**，减少服务器压力，获得实时更新
3. **代理接口 `/api/proxy/*`**：解决前端跨域问题，直接使用即可
4. **测试接口 `/api/test/*`**：无需登录，方便快速测试
5. **管理接口 `/api/admin/*`**：动态调整 Worker 配置，无需重启服务
6. **完整文档**：访问 http://localhost:4100/api-docs 查看交互式文档

---

## 📚 相关文档

- **[openapi.yaml](openapi.yaml)** - OpenAPI 3.0 完整规范
- **[COMPLETE_WORKFLOW.md](COMPLETE_WORKFLOW.md)** - 完整工作流程
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - 系统架构设计

---

**最后更新：2025-01-21**
