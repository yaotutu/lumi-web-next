import { ZodError } from "zod";
import { listTasksQuerySchema } from "@/lib/validators/task-validators";

function debugAPIRoute() {
  console.log("🔍 调试API路由参数处理...\n");

  try {
    // 模拟API路由中的参数处理
    console.log("Test 1: 模拟空参数");
    const searchParams1 = new URLSearchParams();
    const queryParams1 = {
      status: searchParams1.get("status") as any,
      limit: searchParams1.get("limit"),
    };
    console.log("查询参数:", queryParams1);
    const result1 = listTasksQuerySchema.parse(queryParams1);
    console.log("验证结果:", result1);

    // 模拟带limit参数
    console.log("\nTest 2: 模拟带limit参数");
    const searchParams2 = new URLSearchParams("limit=10");
    const queryParams2 = {
      status: searchParams2.get("status") as any,
      limit: searchParams2.get("limit"),
    };
    console.log("查询参数:", queryParams2);
    const result2 = listTasksQuerySchema.parse(queryParams2);
    console.log("验证结果:", result2);

    // 模拟带status参数
    console.log("\nTest 3: 模拟带status参数");
    const searchParams3 = new URLSearchParams("status=PENDING");
    const queryParams3 = {
      status: searchParams3.get("status") as any,
      limit: searchParams3.get("limit"),
    };
    console.log("查询参数:", queryParams3);
    const result3 = listTasksQuerySchema.parse(queryParams3);
    console.log("验证结果:", result3);
  } catch (error) {
    if (error instanceof ZodError) {
      console.log("验证失败:", error.issues);
    } else {
      console.error("其他错误:", error);
    }
  }
}

debugAPIRoute();
