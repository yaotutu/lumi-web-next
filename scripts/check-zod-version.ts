import { z } from "zod";

console.log("Zod已导入成功");

// 检查ZodError的结构
try {
  const schema = z.string();
  schema.parse(123);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log("ZodError properties:", Object.keys(error));
    console.log("Has issues property:", 'issues' in error);
    console.log("Issues value:", error.issues);
  }
}