import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { POST as proxyRequest } from "@/app/api/v1/proxy/route";
import { validateApiKey } from "@/lib/proxy/auth";
import { getDemoQuotaStatus, releaseDemoQuota, reserveDemoQuota } from "@/lib/demo/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COOKIE = "llmgate_demo_visitor";
const MAX_PROMPT_LENGTH = 350;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function visitorId(request: NextRequest): string | null {
  const value = request.cookies.get(COOKIE)?.value;
  return value && UUID.test(value) ? value : null;
}

function visitorIp(request: NextRequest): string | null {
  const value = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return value && value.length <= 100 ? value : null;
}

function demoIsConfigured(): boolean {
  return Boolean(process.env.SITE_DEMO_API_KEY?.startsWith("ag_") &&
    UUID.test(process.env.SITE_DEMO_TENANT_ID ?? "") &&
    (process.env.ADMIN_JWT_SECRET?.length ?? 0) >= 32);
}

function issueCookie(response: Response, id: string, secure: boolean): Response {
  response.headers.append("Set-Cookie", `${COOKIE}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure ? "; Secure" : ""}`);
  return response;
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!demoIsConfigured()) {
    return NextResponse.json({ enabled: false, available: false, globalRemaining: 0 }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const status = await getDemoQuotaStatus(visitorId(request), visitorIp(request));
    return NextResponse.json({ enabled: true, ...status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Public demo quota status failed:", error);
    return NextResponse.json({ enabled: true, available: false, globalRemaining: 0 }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!demoIsConfigured()) {
    return NextResponse.json({ error: "Live questions are temporarily unavailable. The saved examples are still available." }, { status: 503 });
  }
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Open this demo from the site." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Send a JSON question." }, { status: 415 });
  }

  let prompt: string;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 1024) throw new Error("too large");
    const raw = await request.text();
    if (raw.length > 1024) throw new Error("too large");
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as { prompt?: unknown }).prompt !== "string") {
      throw new Error("invalid");
    }
    prompt = (body as { prompt: string }).prompt.trim();
  } catch {
    return NextResponse.json({ error: "Enter one question of up to 350 characters." }, { status: 400 });
  }
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: "Enter one question of up to 350 characters." }, { status: 400 });
  }

  const demoKey = process.env.SITE_DEMO_API_KEY!;
  const configuredTenant = process.env.SITE_DEMO_TENANT_ID!;
  try {
    const auth = await validateApiKey(demoKey);
    if (!auth || auth.tenantId !== configuredTenant) {
      console.error("Public demo key is missing, revoked, or assigned to the wrong tenant");
      return NextResponse.json({ error: "Live questions are temporarily unavailable." }, { status: 503 });
    }
  } catch (error) {
    console.error("Public demo key validation failed:", error);
    return NextResponse.json({ error: "Live questions are temporarily unavailable." }, { status: 503 });
  }

  const id = visitorId(request) ?? randomUUID();
  const ip = visitorIp(request);
  let admitted: Awaited<ReturnType<typeof reserveDemoQuota>>;
  try {
    admitted = await reserveDemoQuota(id, ip);
  } catch (error) {
    console.error("Public demo quota admission failed:", error);
    return NextResponse.json({ error: "Live questions are temporarily unavailable. Try a saved example." }, { status: 503 });
  }
  if (admitted !== "allowed") {
    const error = admitted === "global"
      ? "Today's live demo allowance has been used. Try a saved example."
      : "Your live demo allowance has been used for today. Try a saved example.";
    return NextResponse.json({ error }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  try {
    const internalRequest = new NextRequest(new URL("/api/v1/proxy", request.url), {
      method: "POST",
      headers: { authorization: `Bearer ${demoKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "auto",
        messages: [{ role: "user", content: prompt }],
        max_output_tokens: 256,
        include_gateway_meta: true,
      }),
      signal: request.signal,
    });
    const upstream = await proxyRequest(internalRequest);
    if (!upstream.ok || !upstream.body) {
      await releaseDemoQuota(id, ip);
      const error = upstream.status === 402
        ? "The live demo budget has been used. Try a saved example."
        : "The live demo could not answer right now. Please try again.";
      return NextResponse.json({ error }, { status: upstream.status === 402 ? 429 : 503 });
    }
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Request-ID": upstream.headers.get("X-Request-ID") ?? "",
      "X-Cache": upstream.headers.get("X-Cache") ?? "MISS",
    });
    return issueCookie(new Response(upstream.body, { status: 200, headers }), id, request.nextUrl.protocol === "https:");
  } catch (error) {
    console.error("Public demo proxy failed:", error);
    await releaseDemoQuota(id, ip).catch((releaseError) => console.error("Public demo quota refund failed:", releaseError));
    return NextResponse.json({ error: "The live demo could not answer right now. Please try again." }, { status: 503 });
  }
}
