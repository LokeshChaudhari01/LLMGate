import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-request";
import { db } from "@/lib/db";
import { tenants, apiKeys } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { invalidateTenantKeys } from "@/lib/redis/key-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const res = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        budgetUsd: tenants.budgetUsd,
        isActive: tenants.isActive,
        createdAt: tenants.createdAt,
        keyCount: sql<number>`count(${apiKeys.id})`.mapWith(Number),
      })
      .from(tenants)
      .leftJoin(apiKeys, eq(tenants.id, apiKeys.tenantId))
      .groupBy(tenants.id)
      .orderBy(tenants.createdAt);

    return NextResponse.json(res);
  } catch (error) {
    console.error("Failed to fetch tenants:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const { name, budgetUsd } = body;

    const parsedBudget = Number(budgetUsd);
    if (typeof name !== "string" || !name.trim() || name.length > 255 ||
        !Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      return NextResponse.json({ error: "Enter a name and a positive budget" }, { status: 400 });
    }

    const res = await db.insert(tenants).values({
      name: name.trim(),
      budgetUsd: parsedBudget.toFixed(6),
    }).returning();

    return NextResponse.json(res[0]);
  } catch (error) {
    console.error("Failed to create tenant:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const { id, budgetUsd, isActive } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updates: { budgetUsd?: string; isActive?: boolean } = {};
    if (budgetUsd !== undefined) {
      const parsedBudget = Number(budgetUsd);
      if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
        return NextResponse.json({ error: "Budget must be zero or greater" }, { status: 400 });
      }
      updates.budgetUsd = parsedBudget.toFixed(6);
    }
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
      }
      updates.isActive = isActive;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes supplied" }, { status: 400 });
    }

    const res = await db.update(tenants)
      .set(updates)
      .where(eq(tenants.id, id))
      .returning();

    if (!res[0]) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    if (budgetUsd !== undefined || isActive !== undefined) await invalidateTenantKeys(id);
    return NextResponse.json(res[0]);
  } catch (error) {
    console.error("Failed to update tenant:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Keep the tenant row so historical usage and budget reservations retain
    // their owner. Deactivation immediately blocks new API-key admissions.
    const deactivated = await db.update(tenants)
      .set({ isActive: false })
      .where(eq(tenants.id, id))
      .returning({ id: tenants.id });
    if (!deactivated[0]) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    await invalidateTenantKeys(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete tenant:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
