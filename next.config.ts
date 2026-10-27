import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // A package-lock.json in the home directory makes Turbopack treat that
  // folder as the app root, so project dependencies fail to resolve.
  turbopack: {
    root: path.resolve(__dirname),
  },

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
