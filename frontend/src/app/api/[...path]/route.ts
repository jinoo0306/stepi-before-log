import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";
const API_KEY = process.env.API_KEY ?? "";

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "server misconfigured: API_KEY missing" },
      { status: 500 }
    );
  }

  const { path } = await ctx.params;
  const targetPath = `/api/${path.join("/")}`;
  const search = req.nextUrl.search ?? "";
  const target = `${BACKEND_URL}${targetPath}${search}`;

  const headers = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  headers.set("x-api-key", API_KEY);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 0) init.body = buf;
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (e) {
    return NextResponse.json(
      { error: "backend 연결에 실패했습니다." },
      { status: 502 }
    );
  }

  const respHeaders = new Headers();
  const upstreamCt = upstream.headers.get("content-type");
  if (upstreamCt) respHeaders.set("content-type", upstreamCt);

  // 204 No Content / 304 Not Modified은 body를 가질 수 없다 — null로 전달.
  if (upstream.status === 204 || upstream.status === 304) {
    return new NextResponse(null, {
      status: upstream.status,
      headers: respHeaders,
    });
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
