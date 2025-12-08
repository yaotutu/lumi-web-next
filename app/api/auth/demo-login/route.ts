/**
 * 演示模式自动登录 API
 * 作用：为演示模式提供自动登录功能
 *
 * 功能：
 * - 直接返回演示用户信息
 * - 设置认证Cookie（可选，主要用于前端显示）
 * - 演示模式专用接口
 */

import { NextRequest, NextResponse } from "next/server";
import { success } from "@/lib/utils/api-response";

// 演示用户配置
const DEMO_USER = {
  id: "cmix02id90001i0nmu7wmtnlh",
  email: "demo@demo.com",
  name: "Demo User"
};

export async function GET(request: NextRequest) {
  try {
    // 返回演示用户信息
    const response = success({
      user: {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        name: DEMO_USER.name,
      },
      isDemoMode: true,
      message: "演示模式自动登录"
    });

    // 可选：设置认证Cookie，主要用于前端状态显示
    const cookieValue = JSON.stringify({
      userId: DEMO_USER.id,
      email: DEMO_USER.email
    });

    response.cookies.set("auth-session", cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30天
    });

    return response;

  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "演示登录失败"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POST 和 GET 处理相同
  return GET(request);
}