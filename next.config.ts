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
    ],
  },
};

export default nextConfig;
