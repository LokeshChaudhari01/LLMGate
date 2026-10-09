import { createHmac } from "node:crypto";
import { pool } from "@/lib/db";

const DAILY_LIMIT = 20;
const IP_LIMIT = 3;

type Scope = { scope: "global" | "ip" | "visitor"; identity: string; limit: number };

function secret(): string {
  const value = process.env.ADMIN_JWT_SECRET;
  if (!value || value.length < 32) throw new Error("Demo quota secret is not configured");
  return value;
}

function digest(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function scopes(visitorId: string, ip: string | null): Scope[] {
  const result: Scope[] = [{ scope: "global", identity: "all", limit: DAILY_LIMIT }];
  if (ip) result.push({ scope: "ip", identity: digest(`ip:${ip}`), limit: IP_LIMIT });
  result.push({ scope: "visitor", identity: digest(`visitor:${visitorId}`), limit: 1 });
  return result;
}

export type DemoQuotaStatus = {
  available: boolean;
  globalRemaining: number;
  visitorUsed: boolean;
};

export async function getDemoQuotaStatus(visitorId: string | null, ip: string | null): Promise<DemoQuotaStatus> {
  const selected = scopes(visitorId ?? "not-yet-issued", ip).filter((item) => visitorId || item.scope !== "visitor");
  const result = await pool.query<{ scope: Scope["scope"]; used: number }>(
    `SELECT scope, used FROM public_demo_quota
     WHERE day = (now() AT TIME ZONE 'UTC')::date
       AND ((scope = 'global' AND identity = 'all')
         OR (scope = 'ip' AND identity = $1)
         OR (scope = 'visitor' AND identity = $2))`,
    [selected.find((item) => item.scope === "ip")?.identity ?? "", selected.find((item) => item.scope === "visitor")?.identity ?? ""]
  );
  const used = Object.fromEntries(result.rows.map((row) => [row.scope, row.used]));
  const globalRemaining = Math.max(0, DAILY_LIMIT - (used.global ?? 0));
  const visitorUsed = (used.visitor ?? 0) >= 1;
  return {
    available: globalRemaining > 0 && !visitorUsed && (used.ip ?? 0) < IP_LIMIT,
    globalRemaining,
    visitorUsed,
  };
}

export async function reserveDemoQuota(visitorId: string, ip: string | null): Promise<"allowed" | "visitor" | "ip" | "global"> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of scopes(visitorId, ip)) {
      const result = await client.query(
        `INSERT INTO public_demo_quota (day, scope, identity, used)
         VALUES ((now() AT TIME ZONE 'UTC')::date, $1, $2, 1)
         ON CONFLICT (day, scope, identity)
         DO UPDATE SET used = public_demo_quota.used + 1
         WHERE public_demo_quota.used < $3
         RETURNING used`,
        [item.scope, item.identity, item.limit]
      );
      if (result.rowCount !== 1) {
        await client.query("ROLLBACK");
        return item.scope;
      }
    }
    await client.query("COMMIT");
    return "allowed";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// A request rejected by the gateway before it reaches a provider should not
// consume a visitor's only attempt. Mid-stream failures may still incur usage.
export async function releaseDemoQuota(visitorId: string, ip: string | null): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of scopes(visitorId, ip)) {
      await client.query(
        `UPDATE public_demo_quota SET used = GREATEST(used - 1, 0)
         WHERE day = (now() AT TIME ZONE 'UTC')::date AND scope = $1 AND identity = $2`,
        [item.scope, item.identity]
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
