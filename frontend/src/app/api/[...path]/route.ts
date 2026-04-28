import { NextRequest, NextResponse } from "next/server";

// 이 프록시는 매 요청마다 backend로 forward해야 한다. Next.js가 정적 최적화/캐싱을
// 시도하면 POST가 GET으로 처리되는 등의 증상이 나타날 수 있어 명시적으로 막는다.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

// 각 메서드를 별도 export 함수로 둔다.
// Next.js 15 + Vercel 빌드에서 같은 함수 참조를 여러 메서드 export로 재사용하면
// POST가 GET으로 처리되는 증상이 관찰됨 → 메서드별 wrapper로 회피.
type Ctx = { params: Promise<{ path: string[] }> };
export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}
