import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // next/image only optimizes remote images from hosts you explicitly allow.
    // Our seed data uses placehold.co for placeholder product images.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default nextConfig;
