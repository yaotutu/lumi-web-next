import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "studio.tripo3d.ai",
        pathname: "/static/images/home/**",
      },
      {
        protocol: "https",
        hostname: "tripo-data.rg1.data.tripo3d.com",
        pathname: "/tripo-studio/**",
      },
      {
        protocol: "https",
        hostname: "ai3d-1375240212.cos.ap-guangzhou.myqcloud.com",
      },
      // Lumi Server 代理服务（前后端分离架构）
      // 注意：API 已迁移到独立的 lumi-server 后端项目
      // 代理路由由 lumi-server 提供，用于解决 CORS 问题
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/proxy/**",
      },
      {
        protocol: "http",
        hostname: "192.168.123.100",
        port: "3000",
        pathname: "/api/proxy/**",
      },
    ],
  },

  // 🔧 Vercel Rewrites 代理配置
  // 用途：解决 Vercel 部署时的 Mixed Content 问题
  // 原理：
  //   1. 前端请求相对路径 /api/xxx
  //   2. Vercel 拦截请求并代理到后端 HTTP 服务
  //   3. 浏览器看到的是同域 HTTPS 请求，不会触发 Mixed Content 错误
  // 注意：需要配合环境变量 NEXT_PUBLIC_API_BASE_URL 留空使用
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/:path*", // 前端请求路径（相对路径）
  //       destination: "http://lumi.ai3d.top/api/:path*", // 后端实际地址（HTTP）
  //     },
  //   ];
  // },
};

export default nextConfig;
