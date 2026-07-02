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
      {
        // Real product photos (seed data) are served from Wikimedia Commons.
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
};

export default nextConfig;
