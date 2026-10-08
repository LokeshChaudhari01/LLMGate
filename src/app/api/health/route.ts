import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [database, cache] = await Promise.allSettled([
    pool.query("SELECT 1"),
    redis.ping(),
  ]);

  let workerReady = false;
  if (cache.status === "fulfilled") {
    try {
      workerReady = Boolean(await redis.get("auragate:worker:heartbeat"));
    } catch {
      workerReady = false;
    }
  }

  const checks = {
    database: database.status === "fulfilled" ? "ok" : "down",
    redis: cache.status === "fulfilled" ? "ok" : "down",
    worker: workerReady ? "ok" : "down",
  };
  const healthy = Object.values(checks).every((value) => value === "ok");
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
