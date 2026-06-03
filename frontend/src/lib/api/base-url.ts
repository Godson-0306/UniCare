/** Build absolute API URLs without axios path-join bugs (leading slash drops base path). */
const ENV_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export function getApiBaseUrl(): string {
  const base = ENV_API_URL.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    if (base.startsWith("http")) return base;
    return `${window.location.origin}${base.startsWith("/") ? base : `/${base}`}`;
  }

  if (base.startsWith("http")) return base;
  return `http://127.0.0.1:8000${base.startsWith("/") ? base : `/${base}`}`;
}

export function apiUrl(...segments: string[]): string {
  const base = getApiBaseUrl();
  const path = segments
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return `${base}/${path}${shouldAppendTrailingSlash() ? "/" : ""}`;
}

function shouldAppendTrailingSlash(): boolean {
  if (ENV_API_URL.startsWith("http")) return true;
  return typeof window === "undefined";
}
