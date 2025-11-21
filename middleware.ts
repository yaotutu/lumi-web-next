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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Cookie 名称
 */
const AUTH_COOKIE_NAME = "auth-token";

/**
 * JWT 密钥
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("环境变量 JWT_SECRET 未设置");
}

/**
 * 需要登录的路由（使用正则匹配）
 */
const PROTECTED_ROUTES = [
  /^\/workspace$/, // 工作台
  /^\/history$/, // 历史记录
];

/**
 * 公开路由（无需登录）
 */
const PUBLIC_ROUTES = [
  /^\/$/, // 首页
  /^\/login$/, // 登录页
  /^\/gallery/, // 模型广场
  /^\/api\/auth/, // 认证 API（send-code, verify-code, logout）
  /^\/api\/gallery/, // 公开 API
  /^\/_next/, // Next.js 静态资源
  /^\/favicon\.ico$/, // Favicon
  /^\/generated\//, // 生成的文件
];

/**
 * 验证 JWT token 是否有效
 *
 * @param token - JWT 字符串
 * @returns 是否有效
 */
async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查路径是否匹配路由规则
 *
 * @param path - 请求路径
 * @param routes - 路由规则数组
 * @returns 是否匹配
 */
function matchesRoute(path: string, routes: RegExp[]): boolean {
  return routes.some((route) => route.test(path));
}

/**
 * 为响应添加 CORS 头（支持 Swagger UI）
 */
function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Cookie",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

/**
 * Middleware 主函数
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. 处理 API 路由的 OPTIONS 预检请求（CORS）
  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response);
  }

  // 1. 公开路由：直接放行（API 路由添加 CORS 头）
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    const response = NextResponse.next();
    // 为所有 API 请求添加 CORS 头
    if (pathname.startsWith("/api/")) {
      return addCorsHeaders(response);
    }
    return response;
  }

  // 2. 受保护路由：检查登录状态
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    // 未登录：重定向到登录页（带 redirect 参数）
    if (!token || !(await verifyToken(token))) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 已登录：放行
    return NextResponse.next();
  }

  // 3. 其他路由：默认放行（API 路由添加 CORS 头）
  const response = NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return addCorsHeaders(response);
  }
  return response;
}

/**
 * Middleware 配置
 * 只在特定路径上运行（提高性能）
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (Favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
