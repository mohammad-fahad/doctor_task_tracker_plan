export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigurationError";
  }
}

export function resolveApiBaseUrl(value: string | undefined, nodeEnv: string | undefined): string {
  const isProduction = nodeEnv === "production";

  if (!value || value.trim() === "") {
    if (isProduction) {
      throw new ApiConfigurationError("NEXT_PUBLIC_API_BASE_URL must be set in production");
    }
    return "http://localhost:4000/api/v1";
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
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
