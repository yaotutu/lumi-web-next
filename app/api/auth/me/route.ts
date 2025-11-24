/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "user": { ... }
 *   }
 * }
 *
 * 错误：
 * - 401 UNAUTHORIZED - 用户未登录
 */

import { getUserById } from "@/lib/services/auth-service";
import { getCurrentUser } from "@/lib/utils/auth";
import { withErrorHandler } from "@/lib/utils/errors";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // 1. 从 Cookie 中获取当前用户会话信息
  const userSession = await getCurrentUser();

  // 2. 查询用户详细信息
  const user = await getUserById(userSession.userId);

  // 3. 返回用户信息
  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    },
  });
});
