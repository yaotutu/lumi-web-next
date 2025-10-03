import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "studio.tripo3d.ai",
        pathname: "/static/images/home/**",
      },
    ],
  },
};

export default nextConfig;
