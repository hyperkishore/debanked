import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/debanked",
  images: { unoptimized: true },
};

export default nextConfig;
