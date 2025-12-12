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
        hostname: "192.168.88.100",
        port: "3000",
        pathname: "/api/proxy/**",
      },
    ],
  },
};

export default nextConfig;
