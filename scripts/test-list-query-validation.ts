/**
 * Zod验证测试脚本 - 专门测试任务列表查询参数
 * 验证请求验证器在处理null/undefined参数时的行为
 */

import { ZodError } from "zod";
import { listTasksQuerySchema } from "@/lib/validators/task-validators";

function runTest(name: string, testFn: () => void) {
  try {
    testFn();
    console.log(`✅ ${name}: 通过`);
  } catch (error) {
    if (error instanceof ZodError) {
      console.log(`❌ ${name}: 失败`);
      console.log("  错误详情:", JSON.stringify(error.issues, null, 2));
    } else {
      console.log(`❌ ${name}: 失败`);
      console.log("  错误:", error);
    }
  }
}

console.log("🧪 开始测试任务列表查询参数的Zod验证...\n");

// 测试我们遇到的具体问题
runTest("任务列表查询验证 - 空参数对象", () => {
  listTasksQuerySchema.parse({});
});

runTest("任务列表查询验证 - status为undefined", () => {
  listTasksQuerySchema.parse({ status: undefined });
});

runTest("任务列表查询验证 - limit为undefined", () => {
  listTasksQuerySchema.parse({ limit: undefined });
});

runTest("任务列表查询验证 - status和limit都为undefined", () => {
  listTasksQuerySchema.parse({ status: undefined, limit: undefined });
});

console.log("\n--- 测试null值处理 ---");
try {
  console.log("测试status为null:");
  listTasksQuerySchema.parse({ status: null as any });
  console.log("  ✅ 通过");
} catch (error) {
  if (error instanceof ZodError) {
    console.log("  ❌ 失败");
    console.log("  错误详情:", JSON.stringify(error.issues, null, 2));
  } else {
    console.log("  ❌ 失败");
    console.log("  错误:", error);
  }
}

try {
  console.log("测试limit为null:");
  listTasksQuerySchema.parse({ limit: null as any });
  console.log("  ✅ 通过");
} catch (error) {
  if (error instanceof ZodError) {
    console.log("  ❌ 失败");
    console.log("  错误详情:", JSON.stringify(error.issues, null, 2));
  } else {
    console.log("  ❌ 失败");
    console.log("  错误:", error);
  }
}

try {
  console.log("测试status和limit都为null:");
  listTasksQuerySchema.parse({ status: null as any, limit: null as any });
  console.log("  ✅ 通过");
} catch (error) {
  if (error instanceof ZodError) {
    console.log("  ❌ 失败");
    console.log("  错误详情:", JSON.stringify(error.issues, null, 2));
  } else {
    console.log("  ❌ 失败");
    console.log("  错误:", error);
  }
}

// 测试正常情况
console.log("\n--- 测试正常情况 ---");
runTest("任务列表查询验证 - 正常情况1", () => {
  listTasksQuerySchema.parse({ status: "PENDING", limit: "10" });
});

runTest("任务列表查询验证 - 正常情况2", () => {
  listTasksQuerySchema.parse({ status: "COMPLETED" });
});

runTest("任务列表查询验证 - 正常情况3", () => {
  listTasksQuerySchema.parse({ limit: "20" });
});

console.log("\n✅ 任务列表查询参数Zod验证测试完成!");
