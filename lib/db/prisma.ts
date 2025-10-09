import { PrismaClient } from "@prisma/client";
import { createLogger } from "../logger";

// 创建 Prisma 日志器
const prismaLogger = createLogger("Prisma");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 配置 Prisma Client 以事件方式发出日志
// 只有 query 日志通过事件处理，其他的直接输出到 stdout
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "error" },
      { emit: "stdout", level: "info" },
      { emit: "stdout", level: "warn" },
    ],
  });

// 监听 Prisma 查询日志事件并重定向到 Pino
// @ts-ignore
prisma.$on("query", (e: any) => {
  prismaLogger.debug("query", "Prisma Query", {
    query: (e as any).query,
    params: (e as any).params,
    duration: (e as any).duration,
    timestamp: (e as any).timestamp,
  });
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
