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
 * - 清除 HTTP-only Cookie（auth-token）
 */

import { withErrorHandler } from "@/lib/utils/errors";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cookie 名称
 */
const AUTH_COOKIE_NAME = "auth-token";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. 创建响应
  const response = NextResponse.json({
    success: true,
    message: "已退出登录",
  });

  // 2. 清除 Cookie（设置过期时间为过去）
  response.cookies.delete(AUTH_COOKIE_NAME);

  return response;
});
