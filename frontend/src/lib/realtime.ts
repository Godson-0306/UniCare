import { useAuthStore } from "@/stores/auth-store";

function appendQueryParam(url: string, key: string, value: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export function getNotificationsWebSocketUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const accessToken = useAuthStore.getState().tokens?.access;
  const explicitUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (explicitUrl) {
    const url = explicitUrl.endsWith("/ws/notifications/") ? explicitUrl : `${explicitUrl.replace(/\/$/, "")}/ws/notifications/`;
    return accessToken ? appendQueryParam(url, "token", accessToken) : url;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const baseUrl = `${protocol}://${window.location.host}/ws/notifications/`;
  return accessToken ? appendQueryParam(baseUrl, "token", accessToken) : baseUrl;
}
