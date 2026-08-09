import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.BACKEND_INTERNAL_URL ??
  (process.env.VERCEL ? "https://unicare-backend-r7y5.onrender.com" : "http://127.0.0.1:8000")
).replace(/\/$/, "");
const HOSPITAL_TOKEN =
  process.env.NEXT_PUBLIC_HOSPITAL_ACCESS_TOKEN ||
  (process.env.VERCEL
    ? "085ceb8068750bccf73e8f76c71ef7de59092dada1f5f823"
    : process.env.NODE_ENV === "development"
      ? "change-hospital-access-secret"
      : "");
export const HOSPITAL_PREFIXES = ["reception", "nurse", "doctor", "pharmacy", "lab", "emergency", "appointments", "audit"];

function unavailableResponse() {
  const message =
    process.env.NODE_ENV === "production"
      ? "API server unavailable. Check BACKEND_INTERNAL_URL and the Render backend service."
      : "API server unavailable. Run npm run dev from the project root to start backend + frontend.";
  return NextResponse.json({ success: false, error: { message } }, { status: 503 });
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const subPath = pathSegments.join("/");
  const target = new URL(`/api/v1/${subPath}/`, `${BACKEND_URL}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);
  const hospitalToken = request.headers.get("x-hospital-access-token");
  if (hospitalToken) headers.set("x-hospital-access-token", hospitalToken);
  if (!hospitalToken && HOSPITAL_TOKEN && HOSPITAL_PREFIXES.includes(pathSegments[0] ?? "")) {
    headers.set("x-hospital-access-token", HOSPITAL_TOKEN);
  }
  // Prefer the edge client IP when present so backend audit logs stay useful.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return unavailableResponse();
  }

  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) responseHeaders.set("content-type", upstreamType);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
