/**
 * POST /api/auth/verify-code
 * 验证码登录
 *
 * 请求体：
 * {
 *   "email": "user@example.com",
 *   "code": "0000"
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "user": { ... },
 *     "message": "登录成功"
 *   }
 * }
 *
 * 副作用：
 * - 设置 HTTP-only Cookie（auth-session）
 */

import { verifyCodeAndLogin } from "@/lib/services/auth-service";
import { setUserCookie } from "@/lib/utils/auth";
import { withErrorHandler } from "@/lib/utils/errors";
import { VerifyCodeSchema } from "@/lib/validators/auth.validator";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. 解析请求体
  const body = await request.json();

  // 2. 验证输入数据
  const { email, code } = VerifyCodeSchema.parse(body);

  // 3. 调用 Service 层验证验证码并登录
  const user = await verifyCodeAndLogin(email, code);

  // 4. 设置用户会话 Cookie
  await setUserCookie({
    userId: user.id,
    email: user.email,
  });

  // 5. 返回响应
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
      message: "登录成功",
    },
  });
});
