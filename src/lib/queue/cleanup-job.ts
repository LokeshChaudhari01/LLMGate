import "dotenv/config";
import { pool } from "@/lib/db";
import { getTelemetryQueue } from "./telemetry-queue";
import { releaseReservation } from "@/lib/proxy/budget";

export async function scheduleCleanupJob() {
  await getTelemetryQueue().add(
    "cleanup",
    {} as import("./telemetry-queue").TelemetryJobData,
    {
      repeat: { pattern: "*/10 * * * *" },
      jobId: "maintenance-cleanup",
    }
  );
}

export async function processCleanupJob() {
  try {
    const res = await pool.query(
      `DELETE FROM processed_jobs WHERE processed_at < NOW() - INTERVAL '7 days'`
    );
    console.log(`🧹 [Cleanup] Removed ${res.rowCount} old processed_jobs rows.`);
    const stale = await pool.query<{ request_id: string }>(
      `SELECT request_id FROM budget_reservations
       WHERE created_at < NOW() - INTERVAL '15 minutes'
       ORDER BY created_at LIMIT 100`
    );
    for (const row of stale.rows) {
      // A queued or failed job still owns its reservation. Only a missing job
      // means the request crashed before enqueue and can be safely refunded.
      if (!await getTelemetryQueue().getJob(row.request_id)) {
        await releaseReservation(row.request_id);
        console.log(`🧹 [Cleanup] Released orphan reservation ${row.request_id}`);
      }
    }
  } catch (error) {
    console.error("🔴 [Cleanup] Maintenance failed:", error);
    throw error;
  }
}
