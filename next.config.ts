import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["better-sqlite3", "@stellar/stellar-sdk", "@x402/stellar", "@x402/core"],
  env: {
    NEXT_PUBLIC_TESOURO_ASSET_ISSUER: process.env.TESOURO_ASSET_ISSUER ?? "",
    NEXT_PUBLIC_USDC_ASSET_ISSUER: process.env.USDC_ASSET_ISSUER ?? "",
  },
};

export default nextConfig;
