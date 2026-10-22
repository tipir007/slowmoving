import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite", "tesseract.js"],
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=()" }],
      },
    ];
  },
};

export default nextConfig;
