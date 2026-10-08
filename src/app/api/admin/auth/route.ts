import { NextResponse } from "next/server";
import { signAdminJwt } from "@/lib/auth/jwt";
import { checkRateLimit } from "@/lib/redis/rate-limiter";

const COOKIE_NAME = "admin_session";
const IS_PROD     = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || "unknown";
  const limit = await checkRateLimit(`admin-login:${ip}`, 5, 15 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let password: unknown;
  try {
    const body: unknown = await req.json();
    password = body && typeof body === "object" && "password" in body ? body.password : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof password !== "string" || !password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await signAdminJwt();
  const res   = NextResponse.json({ ok: true });

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: IS_PROD,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours in seconds
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
