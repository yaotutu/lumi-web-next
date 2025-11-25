/**
 * Next.js Middleware - 路由守卫
 * 职责：拦截需要登录的页面，验证用户身份
 *
 * 保护的路由：
 * - /workspace - 工作台
 * - /history - 历史记录
 *
 * 未登录时：
 * - 重定向到 /login?redirect={原始路径}
 *
 * 登录后：
 * - 跳转回 redirect 参数指定的页面
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Cookie 名称
 */
const AUTH_COOKIE_NAME = "auth-session";

/**
 * 需要登录才能访问的路由
 */
const PROTECTED_ROUTES = ["/workspace", "/history", "/assets"];

/**
 * 公开路由（不需要登录）
 */
const PUBLIC_ROUTES = ["/", "/login", "/gallery", "/api"];

/**
 * 验证用户会话
 *
 * @param request - Next.js 请求对象
 * @returns 是否已登录
 */
function isAuthenticated(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return false;
  }

  try {
    // 验证 JSON 格式
    const userSession = JSON.parse(sessionCookie);

    // 验证必需字段
    return !!(userSession.userId && userSession.email);
  } catch (_error) {
    // JSON 解析失败或格式错误
    return false;
  }
}

/**
 * 中间件主函数
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是公开路由
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route),
  );

  // 如果是公开路由，直接放行
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 检查是否是受保护的路由
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route),
  );

  // 如果是受保护的路由，检查用户登录状态
  if (isProtectedRoute) {
    if (!isAuthenticated(request)) {
      // 用户未登录，重定向到登录页面
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);

      return NextResponse.redirect(loginUrl);
    }
  }

  // 其他情况放行
  return NextResponse.next();
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
