import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000";
const HOSPITAL_TOKEN =
  process.env.NEXT_PUBLIC_HOSPITAL_ACCESS_TOKEN ??
  (process.env.NODE_ENV === "development" ? "change-hospital-access-secret" : "");
export const HOSPITAL_PREFIXES = ["reception", "nurse", "doctor", "pharmacy", "lab", "emergency", "appointments", "audit"];

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const subPath = pathSegments.join("/");
  const target = new URL(`/api/v1/${subPath}/`, BACKEND_URL);
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

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "API server unavailable. Run npm run dev from the project root to start backend + frontend.",
        },
      },
      { status: 503 }
    );
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
