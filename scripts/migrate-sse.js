/**
 * 迁移脚本：将 EventSource 替换为 SSEClient
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/workspace/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. 修改 import 语句
content = content.replace(
  'import { apiGet, apiPatch, apiPost, createEventSource } from "@/lib/api-client";',
  'import { apiGet, apiPatch, apiPost } from "@/lib/api-client";\nimport { SSEClient } from "@/lib/sse-client";'
);

// 2. 替换 createEventSource 为 SSEClient
content = content.replace(
  'const eventSource = createEventSource(`/api/tasks/${taskId}/events`);',
  `const sseClient = new SSEClient(\`/api/tasks/\${taskId}/events\`, {
      autoReconnect: true,
      reconnectDelay: 2000,
      maxReconnectAttempts: 5,
      onOpen: () => {
        console.log("✅ SSE 连接已建立");
      },
      onClose: () => {
        console.log("ℹ️ SSE 连接已关闭");
      },
      onError: (error) => {
        console.error("❌ SSE 连接错误", error);
      },
    });`
);

// 3. 替换所有 eventSource.addEventListener 为 sseClient.on
content = content.replace(/eventSource\.addEventListener\("([^"]+)",\s*\(event\)\s*=>\s*{/g, (match, eventType) => {
  return `sseClient.on("${eventType}", (event) => {`;
});

// 4. 替换事件数据解析（移除 JSON.parse，因为 SSEClient 已经自动解析）
content = content.replace(/const (\w+) = JSON\.parse\(event\.data\);/g, 'const $1 = event.data;');
content = content.replace(/const initialTask = JSON\.parse\(event\.data\);/g, 'const initialTask = event.data;');
content = content.replace(/const { ([^}]+) } = JSON\.parse\(event\.data\);/g, 'const { $1 } = event.data;');

// 5. 移除 eventSource.onopen 和 eventSource.onerror（已在构造函数中处理）
content = content.replace(/\/\*\*\s*\*\s*处理连接打开\s*\*\/\s*eventSource\.onopen = \(\) => \{[\s\S]*?\};/g, '');
content = content.replace(/\/\*\*\s*\*\s*处理连接错误[\s\S]*?\*\/\s*eventSource\.onerror = \(error\) => \{[\s\S]*?\};/g, '');

// 6. 添加 connect 调用
content = content.replace(
  /}\);(\s*)\/\/ ========================================\s*\/\/ 清理函数/,
  `});

    // 建立连接
    sseClient.connect();$1// ========================================
    // 清理函数`
);

// 7. 替换清理函数中的 eventSource.close() 为 sseClient.disconnect()
content = content.replace(
  'eventSource.close();',
  'sseClient.disconnect();'
);

// 8. 更新注释
content = content.replace(
  '为什么用 SSE 而不是轮询？\n   * 1. 实时性更好：Worker 完成立即推送，无延迟\n   * 2. 减少服务器压力：不再每秒轮询数据库\n   * 3. 用户体验更好：进度更新更流畅',
  '架构优势：\n   * - 实时性：Worker 完成操作立即推送，延迟 < 100ms\n   * - 安全性：使用 fetch + ReadableStream 实现，支持携带 Bearer Token\n   *\n   * 为什么不用 EventSource？\n   * - EventSource 不支持自定义 HTTP Headers\n   * - 无法携带 Authorization Token 进行认证\n   * - 本实现使用 SSEClient 类解决了这个问题'
);

content = content.replace(
  '// ✅ 修复：使用统一的 EventSource 封装函数',
  '// ✅ 使用新的 SSEClient（支持 Bearer Token）'
);

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ 迁移完成！');
console.log('修改的文件:', filePath);
