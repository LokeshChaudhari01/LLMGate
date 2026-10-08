import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-request";
import { db } from "@/lib/db";
import { apiKeys, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { invalidateKeyCache } from "@/lib/redis/key-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const res = await db
      .select({
        id: apiKeys.id,
        tenantId: apiKeys.tenantId,
        tenantName: tenants.name,
        description: apiKeys.description,
        keyHash: apiKeys.keyHash,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .leftJoin(tenants, eq(apiKeys.tenantId, tenants.id))
      .orderBy(apiKeys.createdAt);

    return NextResponse.json(res);
  } catch (error) {
    console.error("Failed to fetch keys:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const { tenantId, description } = body;

    if (typeof tenantId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId) ||
        typeof description !== "string" || !description.trim() || description.length > 255) {
      return NextResponse.json({ error: "Select a tenant and enter a description" }, { status: 400 });
    }
    const activeTenant = await db.select({ id: tenants.id, isActive: tenants.isActive }).from(tenants)
      .where(eq(tenants.id, tenantId)).limit(1);
    if (!activeTenant[0]) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    if (!activeTenant[0].isActive) {
      return NextResponse.json({ error: "Tenant is inactive" }, { status: 400 });
    }

    // Generate a raw key
    const rawKey = `ag_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const res = await db.insert(apiKeys).values({
      tenantId,
      description: description.trim(),
      keyHash,
    }).returning();

    // Return the raw key ONCE
    return NextResponse.json({ ...res[0], rawKey });
  } catch (error) {
    console.error("Failed to create key:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const res = await db.update(apiKeys)
      .set({ isActive: false })
      .where(eq(apiKeys.id, id))
      .returning();

    if (!res[0]) return NextResponse.json({ error: "Key not found" }, { status: 404 });
    await invalidateKeyCache(res[0].keyHash);
    return NextResponse.json(res[0]);
  } catch (error) {
    console.error("Failed to revoke key:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
