export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigurationError";
  }
}

const DEVELOPMENT_FALLBACK = "http://localhost:4000/api/v1";

export function resolveApiBaseUrl(value: string | undefined, nodeEnv: string | undefined): string | undefined {
  const isProduction = nodeEnv === "production";
  const trimmed = value?.trim();
  if (!trimmed) return isProduction ? undefined : DEVELOPMENT_FALLBACK;
  return trimmed.replace(/\/+$/, "");
}

export function assertApiBaseUrl(
  base: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV
): string {
  const isProduction = nodeEnv === "production";
  const trimmed = base?.trim();

  if (!trimmed) {
    if (isProduction) throw new ApiConfigurationError("NEXT_PUBLIC_API_BASE_URL must be set in production");
    return DEVELOPMENT_FALLBACK;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ApiConfigurationError("NEXT_PUBLIC_API_BASE_URL must be an absolute http(s) URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ApiConfigurationError("NEXT_PUBLIC_API_BASE_URL must use http or https");
  }
  if (isProduction && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
    throw new ApiConfigurationError("NEXT_PUBLIC_API_BASE_URL cannot point to localhost in production");
  }

  return parsed.toString().replace(/\/+$/, "");
}

export function joinApiUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
