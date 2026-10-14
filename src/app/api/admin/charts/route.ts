import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-request";
import { db } from "@/lib/db";
import { usageLogs } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const day = sql<string>`to_char(${usageLogs.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;
    const res = await db
      .select({
        day,
        count: sql<number>`count(*)`.mapWith(Number),
        avgLatency: sql<number>`avg(${usageLogs.latencyMs})`.mapWith(Number),
      })
      .from(usageLogs)
      .groupBy(day)
      .orderBy(day);

    const requestVolume = res.map((r) => ({ day: r.day, count: r.count }));
    const latency = res.map((r) => ({ day: r.day, avgMs: Math.round(r.avgLatency) }));

    return NextResponse.json({ requestVolume, latency });
  } catch (error) {
    console.error("Failed to fetch charts data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
