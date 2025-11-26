/**
 * POST /api/auth/logout
 * 退出登录（JSend 规范）
 *
 * 响应：
 * {
 *   "status": "success",
 *   "data": {
 *     "message": "已退出登录"
 *   }
 * }
 *
 * 副作用：
 * - 清除 HTTP-only Cookie（auth-session）
 */

import type { NextRequest } from "next/server";
import { clearUserCookie } from "@/lib/utils/auth";
import { withErrorHandler } from "@/lib/utils/errors";
import { success } from "@/lib/utils/api-response";

export const POST = withErrorHandler(async (_request: NextRequest) => {
  // 1. 清除用户会话 Cookie（三重保障）
  await clearUserCookie();

  // 2. JSend success 格式
  return success({
    message: "已退出登录",
  });
});
