import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-request";
import { POST as proxyRequest } from "@/app/api/v1/proxy/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<Response> {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const key = process.env.ADMIN_PLAYGROUND_API_KEY ?? process.env.DEMO_API_KEY;
  if (!key?.startsWith("ag_")) {
    return NextResponse.json({ error: "The admin playground key is not configured." }, { status: 503 });
  }
  let prompt: string;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as { prompt?: unknown }).prompt !== "string") throw new Error("invalid");
    prompt = (body as { prompt: string }).prompt.trim();
  } catch {
    return NextResponse.json({ error: "Enter a question." }, { status: 400 });
  }
  if (!prompt || prompt.length > 4000) {
    return NextResponse.json({ error: "Enter a question of up to 4,000 characters." }, { status: 400 });
  }
  const internalRequest = new NextRequest(new URL("/api/v1/proxy", request.url), {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "auto", messages: [{ role: "user", content: prompt }], include_gateway_meta: true }),
    signal: request.signal,
  });
  const upstream = await proxyRequest(internalRequest);
  if (!upstream.ok || !upstream.body) return upstream;
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Request-ID": upstream.headers.get("X-Request-ID") ?? "",
      "X-Cache": upstream.headers.get("X-Cache") ?? "MISS",
    },
  });
}
