import { z } from "zod";

// 检查ZodError的结构
try {
  const schema = z.string().min(1, { message: "不能为空" });
  schema.parse("");
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log("ZodError的所有属性:");
    console.log(Object.getOwnPropertyNames(error));
    console.log("\nZodError的可枚举属性:");
    for (const key in error) {
      console.log(`${key}:`, error[key as keyof typeof error]);
    }

    // 检查是否有issues属性
    console.log("\n是否有issues属性:", 'issues' in error);
    if ('issues' in error) {
      console.log("issues:", error.issues);
    }

    // 检查原型链
    console.log("\n原型链属性:");
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(error)));
  }
}