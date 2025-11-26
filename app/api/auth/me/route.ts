/**
 * GET /api/auth/me
 * 获取当前用户认证状态和用户信息（JSend 规范）
 *
 * **响应格式**：
 * {
 *   "status": "success",
 *   "data": {
 *     "status": "authenticated" | "unauthenticated" | "expired" | "error",
 *     "user": User | null
 *   }
 * }
 *
 * **特点**：
 * - 不再抛出异常，将"未登录"视为正常状态
 * - 返回明确的认证状态枚举
 * - 提供完整的类型安全
 */

import type { NextRequest } from "next/server";
import { getUserById } from "@/lib/services/auth-service";
import { checkAuthStatus } from "@/lib/utils/auth";
import { withErrorHandler } from "@/lib/utils/errors";
import { success } from "@/lib/utils/api-response";
import { AuthStatus } from "@/types/auth";

export const GET = withErrorHandler(async (_request: NextRequest) => {
  // 1. 检查认证状态（静默方式，不抛出异常）
  const authResult = await checkAuthStatus();

  // 2. 根据认证状态处理响应
  if (authResult.isAuthenticated && authResult.userSession) {
    // 用户已登录，查询详细信息
    const user = await getUserById(authResult.userSession.userId);

    // JSend success 格式
    return success({
      status: AuthStatus.AUTHENTICATED,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } else {
    // 用户未登录或认证状态异常
    // JSend success 格式（未登录也是正常状态）
    return success({
      status: authResult.status,
      user: null,
    });
  }
});
