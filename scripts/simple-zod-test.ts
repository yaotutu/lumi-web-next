import { listTasksQuerySchema } from "@/lib/validators/task-validators";
import { ZodError } from "zod";

console.log("测试Zod验证器对null值的处理...\n");

try {
  console.log("测试status为null:");
  listTasksQuerySchema.parse({ status: null as any });
  console.log("  通过");
} catch (error) {
  console.log("  错误类型:", typeof error);
  console.log("  是否为ZodError:", error instanceof ZodError);
  if (error instanceof ZodError) {
    console.log("  errors属性:", error.errors);
    console.log("  errors属性类型:", typeof error.errors);
    console.log("  errors属性长度:", error.errors?.length);
    console.log("  JSON序列化:", JSON.stringify(error, null, 2));
  } else {
    console.log("  错误:", error);
  }
}