/**
 * POST /api/auth/logout
 * 退出登录
 *
 * 响应：
 * {
 *   "success": true,
 *   "message": "已退出登录"
 * }
 *
 * 副作用：
 * - 清除 HTTP-only Cookie（auth-session）
 */

import { clearUserCookie } from "@/lib/utils/auth";
import { withErrorHandler } from "@/lib/utils/errors";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. 清除用户会话 Cookie（三重保障）
  await clearUserCookie();

  // 2. 返回响应
  return NextResponse.json({
    success: true,
    message: "已退出登录",
  });
});
