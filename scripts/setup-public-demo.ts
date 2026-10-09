import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { db, pool } from "../src/lib/db";
import { apiKeys, tenants } from "../src/lib/db/schema";

const ENV_PATH = resolve(process.cwd(), ".env");
const TENANT_NAME = "Public Demo";

function setLocalEnv(values: Record<string, string>) {
  let source = readFileSync(ENV_PATH, "utf8");
  for (const [name, value] of Object.entries(values)) {
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, "m");
    source = pattern.test(source) ? source.replace(pattern, line) : `${source.trimEnd()}\n${line}\n`;
  }
  writeFileSync(ENV_PATH, source, { mode: 0o600 });
}

async function main() {
  let tenant = (await db.select().from(tenants).where(eq(tenants.name, TENANT_NAME)).limit(1))[0];
  if (!tenant) {
    tenant = (await db.insert(tenants).values({ name: TENANT_NAME, budgetUsd: "0.250000" }).returning())[0];
    console.log("Created the Public Demo tenant with a $0.25 gateway budget.");
  }

  const existingKey = process.env.SITE_DEMO_API_KEY ?? process.env.PUBLIC_DEMO_API_KEY;
  let rawKey = existingKey?.startsWith("ag_") ? existingKey : undefined;
  if (rawKey) {
    const hash = createHash("sha256").update(rawKey).digest("hex");
    const match = await db.select({ id: apiKeys.id }).from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.tenantId, tenant.id), eq(apiKeys.isActive, true)))
      .limit(1);
    if (!match[0]) rawKey = undefined;
  }
  if (!rawKey) {
    rawKey = `ag_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    await db.insert(apiKeys).values({ tenantId: tenant.id, keyHash, description: "Public site playground" });
    console.log("Created a dedicated public playground key; its raw value is stored only in local .env.");
  }

  setLocalEnv({ SITE_DEMO_TENANT_ID: tenant.id, SITE_DEMO_API_KEY: rawKey });
  console.log("Public demo configuration saved locally. Add both values to Vercel server environment before publishing live questions.");
}

main().catch((error: Error) => {
  console.error(`Public demo setup failed: ${error.message}`);
  process.exitCode = 1;
}).finally(() => pool.end());
