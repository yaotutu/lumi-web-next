import { type NextRequest, NextResponse } from "next/server";
import * as TaskService from "@/lib/services/task-service";
import { AppError, withErrorHandler } from "@/lib/utils/errors";
import { createLogger } from "@/lib/logger";

// 创建日志器
const log = createLogger("PrintAPI");

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

    log.info("POST", "开始处理打印请求", { taskId: id });

    // 1. 获取任务详情
    const task = await TaskService.getTaskById(id);

    // 2. 验证任务状态
    if (task.status !== "MODEL_COMPLETED") {
      log.warn("POST", "任务状态不允许打印", {
        taskId: id,
        status: task.status,
      });
      throw new AppError(
        "INVALID_STATE",
        "模型尚未生成完成，无法提交打印任务",
        { taskId: id, status: task.status },
      );
    }

    if (!task.model || !task.model.modelUrl) {
      log.warn("POST", "模型文件不存在", { taskId: id });
      throw new AppError("NOT_FOUND", "模型文件不存在", { taskId: id });
    }

    // 3. 提取对象存储路径（去掉URL前缀）
    const objectPath = extractObjectPath(task.model.modelUrl);

    log.info("POST", "提取对象存储路径", {
      taskId: id,
      originalUrl: task.model.modelUrl,
      objectPath,
    });

    // 4. 准备打印服务请求数据
    // 确保 file_name 包含后缀（如果 name 没有后缀，则使用 format 字段补充）
    let fileName = task.model.name;
    if (!fileName.includes(".")) {
      // name 没有后缀，使用 format 字段补充
      const extension = task.model.format.toLowerCase();
      fileName = `${fileName}.${extension}`;
    }

    const printRequest = {
      task_name: `切片任务-${task.prompt.substring(0, 20)}`, // 使用提示词前20个字符作为任务名称
      object_path: objectPath, // 对象存储路径（不包含URL前缀）
      file_name: fileName, // 模型文件名（包含后缀）
      auto_orient: true, // 自动调整方向
      auto_arrange: true, // 自动排列
      auto_convert_unit: true, // 自动转换单位
      scale: 2, // 缩放比例
      upload_to_printer: true, // 上传到打印机
      auto_print: true, // 自动开始打印
    };

    // 5. 调用外部打印服务 API
    const printServiceUrl = "http://192.168.110.214:80/api/v1/tasks";

    log.info("POST", "准备调用打印服务", {
      taskId: id,
      printServiceUrl,
      printRequest,
    });

    try {
      const response = await fetch(printServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(printRequest),
      });

      // 读取原始响应文本（先读取一次，后续可以重用）
      const responseText = await response.text();

      log.info("POST", "收到打印服务响应", {
        taskId: id,
        statusCode: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        responseBody: responseText,
      });

      // 6. 处理打印服务响应
      if (!response.ok) {
        log.error(
          "POST",
          "打印服务返回错误状态",
          new Error(`HTTP ${response.status}`),
          {
            taskId: id,
            statusCode: response.status,
            statusText: response.statusText,
            responseBody: responseText,
            printRequest,
          },
        );

        throw new AppError(
          "EXTERNAL_API_ERROR",
          `打印服务返回错误: ${response.status} ${response.statusText}`,
          {
            statusCode: response.status,
            errorMessage: responseText,
            printRequest,
          },
        );
      }

      // 解析 JSON 响应
      let printResult: any;
      try {
        printResult = JSON.parse(responseText);
      } catch (parseError) {
        log.error("POST", "解析打印服务响应失败", parseError, {
          taskId: id,
          responseText,
        });
        throw new AppError(
          "EXTERNAL_API_ERROR",
          "打印服务返回了无效的 JSON 响应",
          {
            responseText,
            parseError,
          },
        );
      }

      // 8. 保存 slice_task_id 到数据库
      const sliceTaskId = printResult.slice_task_id;
      if (sliceTaskId) {
        try {
          await TaskService.updateModelSliceTaskId(id, sliceTaskId);
          log.info("POST", "打印任务提交成功，已保存 sliceTaskId", {
            taskId: id,
            sliceTaskId,
          });
        } catch (saveError) {
          // 保存失败只记录日志，不影响主流程
          log.warn("POST", "打印任务提交成功，但保存 sliceTaskId 失败", {
            taskId: id,
            sliceTaskId,
            error: saveError,
          });
        }
      } else {
        log.warn("POST", "打印服务未返回 slice_task_id", {
          taskId: id,
          printResult,
        });
      }

      // 9. 返回成功结果
      return NextResponse.json({
        success: true,
        data: {
          taskId: id,
          sliceTaskId, // 打印服务返回的切片任务ID
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

      log.error("POST", "调用打印服务失败", error, {
        taskId: id,
        printServiceUrl,
        printRequest,
      });

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
