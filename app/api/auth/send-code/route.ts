/**
 * POST /api/auth/send-code
 * 发送邮箱验证码
 *
 * 请求体：
 * {
 *   "email": "user@example.com"
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "message": "验证码已发送，请查收（开发环境请使用 0000）"
 * }
 */

import { sendVerificationCode } from "@/lib/services/auth-service";
import { withErrorHandler } from "@/lib/utils/errors";
import { SendCodeSchema } from "@/lib/validators/auth.validator";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. 解析请求体
  const body = await request.json();

  // 2. 验证输入数据
  const { email } = SendCodeSchema.parse(body);

  // 3. 调用 Service 层发送验证码
  await sendVerificationCode(email);

  // 4. 返回成功响应
  return NextResponse.json({
    success: true,
    message: "验证码已发送，请查收（开发环境请使用 0000）",
  });
});
