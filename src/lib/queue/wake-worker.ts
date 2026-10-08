import { after } from "next/server";

/** Keep the Vercel invocation alive until the wake request has been sent. */
export function wakeWorker(): void {
  const baseUrl = process.env.WORKER_WAKE_URL;
  if (!baseUrl) return;

  const wakeRequest = fetch(new URL("/healthz", baseUrl), {
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  }).then((response) => {
    if (!response.ok) console.warn(`[Worker] Wake request returned ${response.status}`);
  }).catch((error: Error) => {
    console.warn("[Worker] Wake request failed:", error.message);
  });

  after(() => wakeRequest);
}
