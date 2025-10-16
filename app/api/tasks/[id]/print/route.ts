import { type NextRequest, NextResponse } from "next/server";
import * as TaskService from "@/lib/services/task-service";
import { AppError, withErrorHandler } from "@/lib/utils/errors";

/**
 * POST /api/tasks/:id/print
 * 一键打印：将3D模型任务提交到外部打印服务
 *
 * 外部打印服务 API:
 * - URL: http://192.168.110.214:80/api/v1/tasks
 * - Method: POST
 * - Body:
 *   {
 *     task_name: "切片任务-{taskId}",
 *     object_path: "models/{taskId}.obj",  // 对象存储路径，不包含URL前缀
 *     file_name: "{模型名称}.obj"
 *   }
 */
export const POST = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

    // 1. 获取任务详情
    const task = await TaskService.getTaskById(id);

    // 2. 验证任务状态
    if (task.status !== "MODEL_COMPLETED") {
      throw new AppError(
        "INVALID_STATE",
        "模型尚未生成完成，无法提交打印任务",
        { taskId: id, status: task.status },
      );
    }

    if (!task.model || !task.model.modelUrl) {
      throw new AppError("NOT_FOUND", "模型文件不存在", { taskId: id });
    }

    // 3. 提取对象存储路径（去掉URL前缀）
    const objectPath = extractObjectPath(task.model.modelUrl);

    // 4. 准备打印服务请求数据
    const printRequest = {
      task_name: `切片任务-${id}`, // 使用任务ID作为任务名称
      object_path: objectPath, // 对象存储路径（不包含URL前缀）
      file_name: task.model.name, // 模型文件名（包含后缀）
    };

    // 5. 调用外部打印服务 API
    const printServiceUrl = "http://192.168.110.214:80/api/v1/tasks";

    try {
      const response = await fetch(printServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(printRequest),
      });

      // 6. 处理打印服务响应
      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(
          "EXTERNAL_API_ERROR",
          `打印服务返回错误: ${response.status} ${response.statusText}`,
          {
            statusCode: response.status,
            errorMessage: errorText,
            printRequest,
          },
        );
      }

      const printResult = await response.json();

      // 7. 返回成功结果
      return NextResponse.json({
        success: true,
        data: {
          taskId: id,
          printTaskId: printResult.task_id || printResult.id, // 打印服务返回的任务ID
          printRequest,
          printResult,
        },
        message: "打印任务已成功提交",
      });
    } catch (error) {
      // 网络错误或其他异常
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "EXTERNAL_API_ERROR",
        `调用打印服务失败: ${error instanceof Error ? error.message : String(error)}`,
        {
          printServiceUrl,
          printRequest,
          originalError: error,
        },
      );
    }
  },
);

/**
 * 从模型 URL 中提取对象存储路径
 *
 * 示例：
 * - 输入: "https://bucket.cos.region.myqcloud.com/models/task123.obj"
 * - 输出: "models/task123.obj"
 *
 * - 输入: "/generated/models/task123.obj"
 * - 输出: "models/task123.obj"
 *
 * @param modelUrl 模型完整 URL 或相对路径
 * @returns 对象存储路径（不包含URL前缀）
 */
function extractObjectPath(modelUrl: string): string {
  // 情况1: 腾讯云 COS 完整 URL
  // https://{bucket}.cos.{region}.myqcloud.com/{key}
  if (modelUrl.startsWith("https://") || modelUrl.startsWith("http://")) {
    try {
      const url = new URL(modelUrl);
      // 移除开头的 '/'
      return url.pathname.substring(1);
    } catch (_error) {
      // URL解析失败，尝试其他方法
    }
  }

  // 情况2: 本地相对路径
  // /generated/models/task123.obj
  if (modelUrl.startsWith("/generated/")) {
    // 移除 "/generated/" 前缀
    return modelUrl.replace(/^\/generated\//, "");
  }

  // 情况3: 已经是对象存储路径
  // models/task123.obj
  if (modelUrl.startsWith("models/")) {
    return modelUrl;
  }

  // 默认：移除所有前导斜杠
  return modelUrl.replace(/^\/+/, "");
}
