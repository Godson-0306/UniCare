import { useAuthStore } from "@/stores/auth-store";

interface WebSocketUrlOptions {
  accessToken?: string;
  explicitUrl?: string;
  apiUrl?: string;
  nodeEnv?: string;
  location: Pick<Location, "protocol" | "host" | "hostname">;
}

function appendQueryParam(url: string, key: string, value: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function withNotificationsPath(url: string) {
  return url.endsWith("/ws/notifications/") ? url : `${url.replace(/\/$/, "")}/ws/notifications/`;
}

function websocketUrlFromHttpUrl(url: string) {
  return url.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://").replace(/\/api\/v1\/?$/, "");
}

export function buildNotificationsWebSocketUrl({
  accessToken,
  explicitUrl,
  apiUrl,
  nodeEnv,
  location,
}: WebSocketUrlOptions) {
  if (explicitUrl) {
    const url = withNotificationsPath(explicitUrl);
    return accessToken ? appendQueryParam(url, "token", accessToken) : url;
  }

  let baseUrl: string;
  if (apiUrl?.startsWith("http")) {
    baseUrl = withNotificationsPath(websocketUrlFromHttpUrl(apiUrl));
  } else if (nodeEnv === "development") {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    baseUrl = `${protocol}://${location.hostname}:8000/ws/notifications/`;
  } else {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    baseUrl = `${protocol}://${location.host}/ws/notifications/`;
  }

  return accessToken ? appendQueryParam(baseUrl, "token", accessToken) : baseUrl;
}

export function getNotificationsWebSocketUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return buildNotificationsWebSocketUrl({
    accessToken: useAuthStore.getState().tokens?.access,
    explicitUrl: process.env.NEXT_PUBLIC_WS_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    nodeEnv: process.env.NODE_ENV,
    location: window.location,
  });
}
