import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Content files are read from disk at build/request time; make sure they ship with server bundles.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
  poweredByHeader: false,
};

export default nextConfig;
