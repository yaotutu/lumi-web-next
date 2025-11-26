/**
 * POST /api/auth/send-code
 * 发送邮箱验证码（JSend 规范）
 *
 * 请求体：
 * {
 *   "email": "user@example.com"
 * }
 *
 * 响应：
 * {
 *   "status": "success",
 *   "data": {
 *     "message": "验证码已发送，请查收（开发环境请使用 0000）"
 *   }
 * }
 */

import type { NextRequest } from "next/server";
import { sendVerificationCode } from "@/lib/services/auth-service";
import { success } from "@/lib/utils/api-response";
import { withErrorHandler } from "@/lib/utils/errors";
import { SendCodeSchema } from "@/lib/validators/auth.validator";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. 解析请求体
  const body = await request.json();

  // 2. 验证输入数据（Zod 自动转换为 JSend fail 格式）
  const { email } = SendCodeSchema.parse(body);

  // 3. 调用 Service 层发送验证码
  await sendVerificationCode(email);

  // 4. JSend success 格式
  return success({
    message: "验证码已发送，请查收（开发环境请使用 0000）",
  });
});
