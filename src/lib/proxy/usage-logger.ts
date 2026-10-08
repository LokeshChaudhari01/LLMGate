// =============================================================================
// AuraGate — Usage Queue
// =============================================================================
// Purpose:
//   Queues usage after a stream finishes. The route awaits enqueue before
//   sending [DONE], keeping the accounting job alive on serverless hosts.
//
// The BullMQ worker writes usage and settles budget reservations. If enqueue
// fails, the reservation is released and the failure is logged.
// =============================================================================

import { getTelemetryQueue } from "@/lib/queue/telemetry-queue";
import { releaseReservation } from "@/lib/proxy/budget";
import type { StreamResult, RoutingReason } from "./providers/types";

/**
 * Enqueues usage before the final SSE event. The worker handles persistence.
 *
 * @param params.requestId - Correlation ID
 * @param params.tenantId - The tenant's UUID
 * @param params.result - StreamResult from the stream handler
 * @param params.cacheHit - Whether this was served from cache
 * @param params.routingReason - Why this model was selected
 * @param params.queryType - Phase 6 query classification
 * @param params.complexityScore - Phase 6 complexity score
 */
export async function logUsageAsync(params: {
  requestId: string;
  tenantId: string;
  result: StreamResult;
  cacheHit: boolean;
  routingReason: RoutingReason;
  queryType?: "simple" | "coding" | "complex";
  complexityScore?: number;
}): Promise<void> {
  const { requestId, tenantId, result, cacheHit, routingReason, queryType, complexityScore } = params;

  try {
    await getTelemetryQueue().add("usage", {
    requestId,
    tenantId,
    provider: result.provider,
    model: result.model,
    routingReason,
    latencyMs: result.latencyMs,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    cacheHit,
    failoverUsed: result.failoverUsed,
    providerStatusCode: result.providerStatusCode,
    status: result.isComplete ? (cacheHit ? "CACHED" : "SUCCESS") : "FAILED",
    queryType: queryType ?? null,
    complexityScore: complexityScore ?? null,
    }, { jobId: requestId });
  } catch (error) {
    console.error(
      `🔴 [UsageLog] Failed to enqueue job for request ${requestId.substring(0, 8)}...:`,
      (error as Error).message
    );
    if (!cacheHit) {
      await releaseReservation(requestId).catch((releaseError: Error) => {
        console.error(`🔴 [UsageLog] Failed to release reservation for ${requestId}:`, releaseError);
      });
    }
  }
}
