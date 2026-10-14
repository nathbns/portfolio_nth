import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// The commit this build was made from, stamped into the footer.
function commit() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  env: {
    BUILD_SHA: commit(),
    BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/gh/devicons/**',
      },
    ],
  },
};

export default nextConfig;
