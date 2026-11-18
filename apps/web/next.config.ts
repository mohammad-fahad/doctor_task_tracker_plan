import type { NextConfig } from "next";

function getApiUpstreamOrigin() {
  const configured = process.env.API_UPSTREAM_ORIGIN?.trim();
  const value = configured || (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000");

  if (!value) {
    throw new Error("API_UPSTREAM_ORIGIN must be set for deployed web environments");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("API_UPSTREAM_ORIGIN must be an absolute http(s) origin");
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("API_UPSTREAM_ORIGIN must contain only an http(s) origin, without credentials or a path");
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("API_UPSTREAM_ORIGIN must use HTTPS in deployed environments");
  }

  return parsed.origin;
}

const apiUpstreamOrigin = getApiUpstreamOrigin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUpstreamOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
