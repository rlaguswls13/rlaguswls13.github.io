import type { NextConfig } from "next";
import { loadLocalEnv } from "./scripts/config/load-local-env.mjs";

loadLocalEnv();

// 사용자 GitHub Pages 저장소(ralguswls13.github.io)는 기본적으로 루트에서 서비스합니다.
// 별도 프로젝트 경로가 필요한 배포에서만 BASE_PATH="/repository-name" 형태로 지정합니다.
const rawBasePath = process.env.BASE_PATH;
const resolvedBasePath = rawBasePath === "ROOT" ? "" : rawBasePath || "";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@blog/ga4-analytics"],
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.NODE_ENV === "production" ? resolvedBasePath : "",
  },
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === "production" ? resolvedBasePath : "",
  trailingSlash: false,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
};

export default nextConfig;
