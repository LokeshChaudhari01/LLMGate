import { pool } from "@/lib/db";
import type { Message } from "./providers/types";

export const MAX_OUTPUT_TOKENS = 1024;
export const MAX_INPUT_CHARACTERS = 100_000;

/**
 * Reserve a conservative upper bound before contacting a provider. This uses
 * the highest input/output prices among the supported models (including the
 * fallback), and a byte count plus message overhead as an input-token bound.
 * The worker refunds the unused amount after it receives provider usage.
 */
export function estimateReservation(messages: Message[], maxOutputTokens = MAX_OUTPUT_TOKENS): string {
  const inputBytes = messages.reduce((sum, message) => sum + Buffer.byteLength(message.content, "utf8"), 0);
  const inputTokenBound = inputBytes + 2_048;
  // This exceeds the supported models' standard text-token rates.
  const microDollars = Math.ceil(inputTokenBound * 2.50 + maxOutputTokens * 15.00);
  return (microDollars / 1_000_000).toFixed(6);
}

/** The conditional UPDATE is the admission gate: concurrent requests cannot
 * reserve more than the remaining balance. The reservation row and deduction
 * commit together, so the worker can safely reconcile them later. */
export async function reserveBudget(requestId: string, tenantId: string, amountUsd: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE tenants SET budget_usd = budget_usd - $1
       WHERE id = $2 AND is_active = true AND budget_usd >= $1
       RETURNING id`,
      [amountUsd, tenantId]
    );
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `INSERT INTO budget_reservations (request_id, tenant_id, amount_usd)
       VALUES ($1, $2, $3)`,
      [requestId, tenantId, amountUsd]
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Used when a request cannot be queued for settlement. */
export async function releaseReservation(requestId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const reservation = await client.query<{ tenant_id: string; amount_usd: string }>(
      `DELETE FROM budget_reservations WHERE request_id = $1
       RETURNING tenant_id, amount_usd`,
      [requestId]
    );
    if (reservation.rows[0]) {
      await client.query(
        `UPDATE tenants SET budget_usd = budget_usd + $1 WHERE id = $2`,
        [reservation.rows[0].amount_usd, reservation.rows[0].tenant_id]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
