import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "../src/lib/db";
import { estimateReservation, releaseReservation, reserveBudget } from "../src/lib/proxy/budget";
import { calculateCost } from "../src/lib/queue/cost-calculator";
import { getTelemetryQueue } from "../src/lib/queue/telemetry-queue";
import { processCleanupJob } from "../src/lib/queue/cleanup-job";

const databaseUrl = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(databaseUrl.hostname)) {
  throw new Error("Integration smoke is restricted to a local test database.");
}

async function waitForUsage(requestId: string) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = await pool.query("SELECT cost_usd FROM usage_logs WHERE request_id = $1", [requestId]);
    if (result.rows[0]) return result.rows[0];
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Worker did not write usage within 10 seconds. Start npm run worker.");
}

async function main() {
  const tenantIds: string[] = [];
  const requestIds: string[] = [];
  try {
    const tenant = await pool.query<{ id: string }>(
      "INSERT INTO tenants (name, budget_usd) VALUES ($1, $2) RETURNING id",
      [`Integration smoke ${randomUUID()}`, "1.000000"]
    );
    const tenantId = tenant.rows[0].id;
    tenantIds.push(tenantId);

    const requestId = randomUUID();
    requestIds.push(requestId);
    const reservedAmount = estimateReservation([{ role: "user", content: "hello" }]);
    assert.equal(await reserveBudget(requestId, tenantId, reservedAmount), true);

    await getTelemetryQueue().add("usage", {
      requestId,
      tenantId,
      provider: "gemini",
      model: "gemini-2.5-flash",
      latencyMs: 100,
      promptTokens: 100,
      completionTokens: 50,
      cacheHit: false,
      failoverUsed: false,
      providerStatusCode: 200,
      status: "SUCCESS",
      routingReason: "default_simple",
      queryType: "simple",
      complexityScore: 0,
    }, { jobId: requestId });

    const usage = await waitForUsage(requestId);
    const expectedCost = calculateCost("gemini-2.5-flash", 100, 50);
    assert.equal(usage.cost_usd, expectedCost);
    const balance = await pool.query<{ budget_usd: string }>(
      "SELECT budget_usd FROM tenants WHERE id = $1", [tenantId]
    );
    assert.equal(balance.rows[0].budget_usd, (1 - Number(expectedCost)).toFixed(6));
    const pending = await pool.query("SELECT 1 FROM budget_reservations WHERE request_id = $1", [requestId]);
    assert.equal(pending.rowCount, 0);

    const tightTenant = await pool.query<{ id: string }>(
      "INSERT INTO tenants (name, budget_usd) VALUES ($1, $2) RETURNING id",
      [`Concurrent smoke ${randomUUID()}`, "0.030000"]
    );
    tenantIds.push(tightTenant.rows[0].id);
    const concurrentIds = [randomUUID(), randomUUID()];
    requestIds.push(...concurrentIds);
    const admissions = await Promise.all(concurrentIds.map((id) =>
      reserveBudget(id, tightTenant.rows[0].id, reservedAmount)
    ));
    assert.equal(admissions.filter(Boolean).length, 1);
    await Promise.all(concurrentIds.map(releaseReservation));

    const orphanId = randomUUID();
    requestIds.push(orphanId);
    assert.equal(await reserveBudget(orphanId, tightTenant.rows[0].id, reservedAmount), true);
    await pool.query(
      "UPDATE budget_reservations SET created_at = NOW() - INTERVAL '16 minutes' WHERE request_id = $1",
      [orphanId]
    );
    await processCleanupJob();
    const orphan = await pool.query("SELECT 1 FROM budget_reservations WHERE request_id = $1", [orphanId]);
    assert.equal(orphan.rowCount, 0);
    console.log("Integration smoke passed: worker settlement, concurrent admission, and orphan refund.");
  } finally {
    await getTelemetryQueue().close();
    if (requestIds.length) {
      await pool.query("DELETE FROM usage_logs WHERE request_id = ANY($1::uuid[])", [requestIds]);
      await pool.query("DELETE FROM processed_jobs WHERE request_id = ANY($1::uuid[])", [requestIds]);
      await pool.query("DELETE FROM budget_reservations WHERE request_id = ANY($1::uuid[])", [requestIds]);
    }
    if (tenantIds.length) {
      await pool.query("DELETE FROM tenants WHERE id = ANY($1::uuid[])", [tenantIds]);
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
