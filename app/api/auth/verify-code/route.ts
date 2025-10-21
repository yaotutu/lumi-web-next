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
 * - 设置 HTTP-only Cookie（auth-token）
 */

import { verifyCodeAndLogin } from "@/lib/services/auth-service";
import { withErrorHandler } from "@/lib/utils/errors";
import { VerifyCodeSchema } from "@/lib/validators/auth.validator";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cookie 名称
 */
const AUTH_COOKIE_NAME = "auth-token";

/**
 * Cookie 有效期（7 天）
 */
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 秒

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. 解析请求体
  const body = await request.json();

  // 2. 验证输入数据
  const { email, code } = VerifyCodeSchema.parse(body);

  // 3. 调用 Service 层验证验证码并登录
  const { user, token } = await verifyCodeAndLogin(email, code);

  // 4. 创建响应并设置 HTTP-only Cookie
  const response = NextResponse.json({
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

  // 5. 设置 Cookie（HTTP-only、Secure、SameSite）
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true, // 防止 JavaScript 访问（防 XSS）
    secure: process.env.NODE_ENV === "production", // 生产环境使用 HTTPS
    sameSite: "lax", // 防止 CSRF 攻击
    maxAge: COOKIE_MAX_AGE, // 7 天过期
    path: "/", // 全站可用
  });

  return response;
});
