/**
 * 错误处理模块测试脚本
 * 测试目标：验证所有错误类型能正确转换为HTTP响应
 */
import { AppError, toErrorResponse } from "../lib/utils/errors";
import { AliyunAPIError } from "../lib/providers/aliyun-image";

console.log("🧪 测试错误处理模块\n");

async function runTests() {
  try {
    // ============================================
    // 测试1: AppError转换
    // ============================================
    console.log("测试1: AppError - VALIDATION_ERROR");
    const validationError = new AppError(
      "VALIDATION_ERROR",
      "Prompt不能为空",
    );
    const response1 = toErrorResponse(validationError);
    const body1 = await response1.json();

    console.log("  状态码:", response1.status);
    console.log("  响应体:", JSON.stringify(body1, null, 2));

    // 验证断言
    if (response1.status !== 400) {
      throw new Error("❌ 状态码应该是400");
    }
    if (body1.code !== "VALIDATION_ERROR") {
      throw new Error("❌ 错误代码应该是VALIDATION_ERROR");
    }
    console.log("  ✅ 通过\n");

    // ============================================
    // 测试2: AppError带详情
    // ============================================
    console.log("测试2: AppError - NOT_FOUND (带详情)");
    const notFoundError = new AppError(
      "NOT_FOUND",
      "任务不存在",
      { taskId: "test-123" },
    );
    const response2 = toErrorResponse(notFoundError);
    const body2 = await response2.json();

    console.log("  状态码:", response2.status);
    console.log("  响应体:", JSON.stringify(body2, null, 2));

    if (response2.status !== 404) {
      throw new Error("❌ 状态码应该是404");
    }
    if (!body2.details) {
      throw new Error("❌ 应该包含details字段");
    }
    console.log("  ✅ 通过\n");

    // ============================================
    // 测试3: AliyunAPIError - 429限流
    // ============================================
    console.log("测试3: AliyunAPIError - 429限流");
    const rateLimitError = new AliyunAPIError(429, "请求过于频繁，请稍后重试");
    const response3 = toErrorResponse(rateLimitError);
    const body3 = await response3.json();

    console.log("  状态码:", response3.status);
    console.log("  响应体:", JSON.stringify(body3, null, 2));

    if (response3.status !== 429) {
      throw new Error("❌ 状态码应该是429");
    }
    if (body3.code !== "EXTERNAL_API_ERROR") {
      throw new Error("❌ 错误代码应该是EXTERNAL_API_ERROR");
    }
    console.log("  ✅ 通过\n");

    // ============================================
    // 测试4: AliyunAPIError - 500服务器错误
    // ============================================
    console.log("测试4: AliyunAPIError - 500服务器错误");
    const serverError = new AliyunAPIError(500, "阿里云服务器内部错误");
    const response4 = toErrorResponse(serverError);
    const body4 = await response4.json();

    console.log("  状态码:", response4.status);
    console.log("  响应体:", JSON.stringify(body4, null, 2));

    if (response4.status !== 500) {
      throw new Error("❌ 状态码应该是500");
    }
    if (body4.statusCode !== 500) {
      throw new Error("❌ 响应体应该包含原始statusCode");
    }
    console.log("  ✅ 通过\n");

    // ============================================
    // 测试5: 未知错误
    // ============================================
    console.log("测试5: 未知错误（标准Error）");
    const unknownError = new Error("Something went wrong");
    const response5 = toErrorResponse(unknownError);
    const body5 = await response5.json();

    console.log("  状态码:", response5.status);
    console.log("  响应体:", JSON.stringify(body5, null, 2));

    if (response5.status !== 500) {
      throw new Error("❌ 状态码应该是500");
    }
    if (body5.code !== "UNKNOWN_ERROR") {
      throw new Error("❌ 错误代码应该是UNKNOWN_ERROR");
    }
    console.log("  ✅ 通过\n");

    // ============================================
    // 测试6: 所有错误代码映射
    // ============================================
    console.log("测试6: 验证所有错误代码映射");
    const errorCodes: Array<[string, number]> = [
      ["VALIDATION_ERROR", 400],
      ["NOT_FOUND", 404],
      ["INVALID_STATE", 409],
      ["QUEUE_FULL", 503],
      ["DATABASE_ERROR", 500],
      ["EXTERNAL_API_ERROR", 500],
      ["UNKNOWN_ERROR", 500],
    ];

    for (const [code, expectedStatus] of errorCodes) {
      const testError = new AppError(code as any, `测试${code}`);
      const response = toErrorResponse(testError);
      if (response.status !== expectedStatus) {
        throw new Error(
          `❌ ${code} 状态码应该是${expectedStatus}，实际是${response.status}`,
        );
      }
    }
    console.log("  ✅ 所有错误代码映射正确\n");

    // ============================================
    // 测试完成
    // ============================================
    console.log("🎉 所有测试通过!");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

// 执行测试
runTests();
