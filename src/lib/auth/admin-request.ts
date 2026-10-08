import { NextRequest, NextResponse } from "next/server";
import { verifyAdminJwt } from "./jwt";

/** Route handlers verify the session themselves; Proxy is only a fast redirect. */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get("admin_session")?.value;
  if (token && await verifyAdminJwt(token)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
