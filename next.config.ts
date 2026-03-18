import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["fluent-ffmpeg", "@ffmpeg-installer/ffmpeg", "@ffprobe-installer/ffprobe", "puppeteer", "busboy"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4gb",
    },
  },
};

export default nextConfig;
