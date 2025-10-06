import { ZodError } from "zod";
import { listTasksQuerySchema } from "@/lib/validators/task-validators";

console.log("测试Zod验证器对null值的处理...\n");

try {
  console.log("测试status为null:");
  listTasksQuerySchema.parse({ status: null as any });
  console.log("  通过");
} catch (error) {
  console.log("  错误类型:", typeof error);
  console.log("  是否为ZodError:", error instanceof ZodError);
  if (error instanceof ZodError) {
    console.log("  issues属性:", error.issues);
    console.log("  issues属性类型:", typeof error.issues);
    console.log("  issues属性长度:", error.issues?.length);
    console.log("  JSON序列化:", JSON.stringify(error, null, 2));
  } else {
    console.log("  错误:", error);
  }
}
