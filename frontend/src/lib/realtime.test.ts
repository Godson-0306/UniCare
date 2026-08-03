import { describe, expect, it } from "vitest";

import { buildNotificationsWebSocketUrl } from "@/lib/realtime";

const localLocation = {
  protocol: "http:",
  host: "localhost:3000",
  hostname: "localhost",
} as Location;

describe("buildNotificationsWebSocketUrl", () => {
  it("uses the backend Daphne port during local development", () => {
    expect(
      buildNotificationsWebSocketUrl({
        accessToken: "abc",
        nodeEnv: "development",
        location: localLocation,
      })
    ).toBe("ws://localhost:8000/ws/notifications/?token=abc");
  });

  it("uses an explicit websocket URL when configured", () => {
    expect(
      buildNotificationsWebSocketUrl({
        accessToken: "abc",
        explicitUrl: "ws://127.0.0.1:9000",
        nodeEnv: "development",
        location: localLocation,
      })
    ).toBe("ws://127.0.0.1:9000/ws/notifications/?token=abc");
  });

  it("derives websocket URL from an absolute API URL", () => {
    expect(
      buildNotificationsWebSocketUrl({
        accessToken: "abc",
        apiUrl: "https://unicare.example.com/api/v1",
        nodeEnv: "production",
        location: localLocation,
      })
    ).toBe("wss://unicare.example.com/ws/notifications/?token=abc");
  });
});
