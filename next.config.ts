import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 不随包发布浏览器端 source map（避免泄露原始 TS 源码）
  productionBrowserSourceMaps: false,
};

export default nextConfig;
