/**
 * SSE (Server-Sent Events) API - 实时任务状态推送
 *
 * GET /api/tasks/[id]/events - 建立 SSE 连接
 *
 * 事件类型：
 * - image:generating - 图片开始生成
 * - image:completed - 图片生成完成（包含 imageUrl）
 * - image:failed - 图片生成失败
 * - model:generating - 模型开始生成
 * - model:progress - 模型生成进度更新（包含 progress 0-100）
 * - model:completed - 模型生成完成（包含 modelUrl）
 * - model:failed - 模型生成失败
 * - task:init - 任务初始状态（连接建立后立即发送）
 */

import { type NextRequest } from "next/server";
import { sseConnectionManager } from "@/lib/sse/connection-manager";
import * as GenerationRequestService from "@/lib/services/generation-request-service";
import { adaptGenerationRequest } from "@/lib/utils/task-adapter-client";
import { createLogger } from "@/lib/logger";

const log = createLogger("SSE-API");

/**
 * GET /api/tasks/[id]/events
 * 建立 SSE 连接，实时推送任务状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await params;

  log.info("GET", "建立 SSE 连接", { taskId });

  const encoder = new TextEncoder();

  // 存储心跳定时器（需要在外部作用域，以便 cancel 时清理）
  let heartbeatInterval: NodeJS.Timeout | undefined;
  let connection:
    | ReturnType<typeof sseConnectionManager.addConnection>
    | undefined;

  // 创建 SSE 流
  const stream = new ReadableStream({
    async start(controller) {
      // 添加到连接管理器
      connection = sseConnectionManager.addConnection(taskId, controller);

      try {
        // 1. 发送初始状态
        log.info("GET", "发送任务初始状态", { taskId });

        try {
          // 查询任务详情
          const generationRequest =
            await GenerationRequestService.getRequestById(taskId);

          // 适配为前端格式
          const taskData = adaptGenerationRequest(generationRequest);

          // 发送初始状态事件
          controller.enqueue(
            encoder.encode(
              `event: task:init\ndata: ${JSON.stringify(taskData)}\n\n`,
            ),
          );
        } catch (error) {
          log.error("GET", "查询任务详情失败", error, { taskId });
          // 发送错误事件
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: "任务不存在或已删除" })}\n\n`,
            ),
          );
          // 关闭连接
          controller.close();
          sseConnectionManager.removeConnection(connection);
          return;
        }

        // 2. 设置心跳定时器（每 30 秒）
        heartbeatInterval = setInterval(() => {
          try {
            sseConnectionManager.sendHeartbeat(connection!);
          } catch (error) {
            log.error("GET", "心跳发送失败，清理连接", error, { taskId });
            clearInterval(heartbeatInterval);
          }
        }, 30000);

        // 3. 监听客户端断开（不阻塞 start 函数）
        request.signal.addEventListener("abort", () => {
          log.info("GET", "客户端主动断开 SSE 连接", { taskId });
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          if (connection) {
            sseConnectionManager.removeConnection(connection);
          }
        });

        // start() 函数执行完毕，连接保持打开
        // ReadableStream 会在客户端断开时自动触发 cancel
      } catch (error) {
        log.error("GET", "SSE 流初始化异常", error, { taskId });
        if (connection) {
          sseConnectionManager.removeConnection(connection);
        }
        controller.close();
      }
    },

    cancel() {
      log.info("GET", "SSE 流被取消", { taskId });
      // 清理资源
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (connection) {
        sseConnectionManager.removeConnection(connection);
      }
    },
  });

  // 返回 SSE 响应
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // 禁用 Nginx 缓冲
    },
  });
}
