import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 允许本地路径（用于演示模式本地存储的图片）
    domains: ['localhost'],
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
    ],
    // 禁用图片优化，使用代理API处理本地图片
    unoptimized: true,
  },
};

export default nextConfig;
