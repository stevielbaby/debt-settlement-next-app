import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Force the correct architecture for native modules
  // Linux containers will use lightningcss-linux-x64-gnu
  serverExternalPackages: [
    'lightningcss',
    'lightningcss-darwin-x64',
    'lightningcss-darwin-arm64',
    'lightningcss-linux-x64-gnu',
    'lightningcss-linux-arm64-gnu',
  ],
};

export default nextConfig;
