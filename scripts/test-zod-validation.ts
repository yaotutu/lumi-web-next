/**
 * Zod验证测试脚本
 * 验证请求验证器是否正常工作
 */

import { ZodError } from "zod";
import {
  addImageSchema,
  createModelSchema,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from "@/lib/validators/task-validators";

function runTest(name: string, testFn: () => void) {
  try {
    testFn();
    console.log(`✅ ${name}: 通过`);
  } catch (error) {
    if (error instanceof ZodError) {
      console.log(`❌ ${name}: 失败`);
      console.log("  错误详情:", error.issues);
    } else {
      console.log(`❌ ${name}: 失败`);
      console.log("  错误:", error);
    }
  }
}

console.log("🧪 开始测试Zod验证器...\n");

// 测试createTaskSchema
runTest("创建任务验证 - 正常情况", () => {
  createTaskSchema.parse({ prompt: "测试提示词" });
});

runTest("创建任务验证 - 空提示词", () => {
  try {
    createTaskSchema.parse({ prompt: "" });
    throw new Error("验证应该失败但没有失败");
  } catch (error) {
    if (error instanceof ZodError) {
      // 预期失败，测试通过
      return;
    }
    throw error;
  }
});

runTest("创建任务验证 - 提示词过长", () => {
  try {
    createTaskSchema.parse({ prompt: "a".repeat(501) });
    throw new Error("验证应该失败但没有失败");
  } catch (error) {
    if (error instanceof ZodError) {
      // 预期失败，测试通过
      return;
    }
    throw error;
  }
});

// 测试updateTaskSchema
runTest("更新任务验证 - 正常情况", () => {
  updateTaskSchema.parse({ status: "COMPLETED", selectedImageIndex: 1 });
});

runTest("更新任务验证 - 无效状态", () => {
  try {
    updateTaskSchema.parse({ status: "INVALID_STATUS" });
    throw new Error("验证应该失败但没有失败");
  } catch (error) {
    if (error instanceof ZodError) {
      // 预期失败，测试通过
      return;
    }
    throw error;
  }
});

// 测试listTasksQuerySchema
runTest("任务列表查询验证 - 正常情况", () => {
  listTasksQuerySchema.parse({ status: "COMPLETED", limit: "10" });
});

runTest("任务列表查询验证 - 限制值转换", () => {
  const result = listTasksQuerySchema.parse({ limit: "25" });
  if (result.limit !== 25) {
    throw new Error("限制值应该被转换为数字");
  }
});

// 测试addImageSchema
runTest("添加图片验证 - 正常情况", () => {
  addImageSchema.parse({
    url: "https://example.com/image.png",
    index: 1,
  });
});

runTest("添加图片验证 - 无效URL", () => {
  try {
    addImageSchema.parse({ url: "invalid-url", index: 1 });
    throw new Error("验证应该失败但没有失败");
  } catch (error) {
    if (error instanceof ZodError) {
      // 预期失败，测试通过
      return;
    }
    throw error;
  }
});

// 测试createModelSchema
runTest("创建模型验证 - 正常情况", () => {
  createModelSchema.parse({ name: "测试模型" });
});

runTest("创建模型验证 - 空名称", () => {
  try {
    createModelSchema.parse({ name: "" });
    throw new Error("验证应该失败但没有失败");
  } catch (error) {
    if (error instanceof ZodError) {
      // 预期失败，测试通过
      return;
    }
    throw error;
  }
});

console.log("\n✅ 所有Zod验证测试完成!");
