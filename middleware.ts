/**
 * Next.js Middleware - API 认证拦截器
 * 职责：统一拦截需要认证的 API 请求，验证用户身份，并通过请求头传递用户信息
 *
 * 架构设计：
 * - 所有页面路由公开访问（无拦截）
 * - API 层统一认证拦截（middleware 唯一认证入口）
 * - 验证通过后，通过请求头 (x-user-id) 传递用户信息给 API
 * - API 直接从请求头读取 userId，无需重复验证
 * - 前端拦截 401 响应，弹出登录弹窗
 *
 * 受保护的 API：
 * - /api/tasks/* - 任务管理（创建、查询）
 * - /api/gallery/models/[id]/interactions - 点赞、收藏
 * - /api/gallery/models/batch-interactions - 批量交互
 * - /api/gallery/models/[id]/download - 下载模型
 * - /api/admin/* - 管理接口
 *
 * 公开 API：
 * - /api/auth/* - 认证相关
 * - /api/proxy/* - 代理服务
 * - /api/openapi - API 文档
 * - /api/gallery/models (GET) - 画廊浏览
 * - /api/workers/status - Worker 状态
 *
 * 未登录时：
 * - 返回 401 + JSend 错误格式
 * - 前端拦截器弹出登录弹窗
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isProtectedRoute } from "@/lib/config/api-routes";

/**
 * Cookie 名称
 */
const AUTH_COOKIE_NAME = "auth-session";

/**
 * 验证用户会话并返回用户信息
 *
 * @param request - Next.js 请求对象
 * @returns { isAuthenticated: boolean, userId?: string, email?: string }
 */
function checkAuth(request: NextRequest): {
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
} {
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return { isAuthenticated: false };
  }

  try {
    // 验证 JSON 格式
    const userSession = JSON.parse(sessionCookie);

    // 验证必需字段
    if (userSession.userId && userSession.email) {
      return {
        isAuthenticated: true,
        userId: userSession.userId,
        email: userSession.email,
      };
    }

    return { isAuthenticated: false };
  } catch (_error) {
    // JSON 解析失败或格式错误
    return { isAuthenticated: false };
  }
}

/**
 * 中间件主函数
 *
 * 优化后的架构：
 * 1. 根据路径和 HTTP 方法判断是否需要认证
 * 2. 验证用户身份
 * 3. 通过请求头传递 userId 给 API（避免 API 内部重复解析 Cookie）
 * 4. API 可以直接从请求头读取 userId，无需再次验证
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 只拦截 /api/* 路由
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 检查是否是需要认证的 API（根据路径和方法）
  if (!isProtectedRoute(pathname, method)) {
    return NextResponse.next();
  }

  // 验证用户登录状态并获取用户信息
  const authResult = checkAuth(request);

  if (!authResult.isAuthenticated) {
    // 用户未登录，返回 401 + JSend 错误格式
    return NextResponse.json(
      {
        status: "fail",
        data: {
          message: "请先登录",
          code: "UNAUTHORIZED",
        },
      },
      { status: 401 },
    );
  }

  // 已登录，通过请求头传递用户信息给 API
  // 这样 API 可以直接读取，无需重复解析 Cookie
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", authResult.userId!);
  requestHeaders.set("x-user-email", authResult.email!);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * 中间件配置
 */
export const config = {
  // 匹配除静态资源外的所有路径
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (网站图标)
     * - public 文件夹下的文件
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
