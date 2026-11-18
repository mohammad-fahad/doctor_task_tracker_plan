const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1";

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
  const res = await fetch(`${API_BASE}${path}`, {
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
