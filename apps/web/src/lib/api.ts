import { assertApiBaseUrl, joinApiUrl, resolveApiBaseUrl } from "./api-config";

const CONFIGURED_BASE = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL, process.env.NODE_ENV);
let validatedBase: string | undefined;

function apiBaseUrl() {
  validatedBase ??= assertApiBaseUrl(CONFIGURED_BASE, process.env.NODE_ENV);
  return validatedBase;
}

export class ApiClientError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type ApiOptions = RequestInit & { json?: unknown };

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;
  const res = await fetch(joinApiUrl(apiBaseUrl(), path), {
    credentials: "include",
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json ? JSON.stringify(json) : options.body,
    ...rest,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = payload?.message || `Request failed (${res.status})`;
    throw new ApiClientError(res.status, message, payload?.details);
  }
  return payload as T;
}
