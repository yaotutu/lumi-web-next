import { listTasksQuerySchema } from "@/lib/validators/task-validators";
import { ZodError } from "zod";

function debugSchema() {
  console.log("🔍 调试Zod Schema验证...\n");

  try {
    // 测试空参数
    console.log("Test 1: 空参数");
    const result1 = listTasksQuerySchema.parse({});
    console.log("结果:", result1);

    // 测试limit参数
    console.log("\nTest 2: limit参数");
    const result2 = listTasksQuerySchema.parse({ limit: "10" });
    console.log("结果:", result2);

    // 测试status参数
    console.log("\nTest 3: status参数");
    const result3 = listTasksQuerySchema.parse({ status: "PENDING" });
    console.log("结果:", result3);

    // 测试组合参数
    console.log("\nTest 4: 组合参数");
    const result4 = listTasksQuerySchema.parse({ status: "PENDING", limit: "10" });
    console.log("结果:", result4);

  } catch (error) {
    if (error instanceof ZodError) {
      console.log("验证失败:", error.errors);
    } else {
      console.error("其他错误:", error);
    }
  }
}

debugSchema();