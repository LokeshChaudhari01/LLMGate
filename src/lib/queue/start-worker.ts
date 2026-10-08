import "dotenv/config";
import { createServer } from "node:http";
import { telemetryWorker } from "./telemetry-worker";
import { scheduleCleanupJob } from "./cleanup-job";
import { getTelemetryQueue } from "./telemetry-queue";
import { pool } from "@/lib/db";

console.log("🚀 [Worker] AuraGate telemetry worker started.");
const port = Number(process.env.PORT || 10000);
let workerReady = false;
const server = createServer((request, response) => {
  if (request.method !== "GET" || request.url !== "/healthz") {
    response.writeHead(404).end();
    return;
  }

  // An HTTP request to this endpoint also wakes a sleeping Render Free service.
  response.writeHead(workerReady ? 200 : 503, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify({ status: workerReady ? "ready" : "starting" }));
});
server.listen(port, "0.0.0.0", () => {
  console.log(`🟢 [Worker] Health endpoint listening on port ${port}.`);
});

async function heartbeat() {
  const connection = await telemetryWorker.client;
  await connection.set("auragate:worker:heartbeat", Date.now().toString(), { EX: 90 });
}
telemetryWorker.on("ready", () => {
  workerReady = true;
  console.log("🟢 [Worker] Ready to process telemetry.");
  heartbeat().catch(console.error);
});
telemetryWorker.on("error", (error) => {
  workerReady = false;
  console.error("🔴 [Worker] Redis connection error:", error);
});
const heartbeatTimer = setInterval(() => heartbeat().catch(console.error), 30_000);
heartbeatTimer.unref();

// Schedule the daily cleanup job
scheduleCleanupJob().catch(console.error);

async function shutdown() {
  clearInterval(heartbeatTimer);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await telemetryWorker.close();
  await getTelemetryQueue().close();
  await pool.end();
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
