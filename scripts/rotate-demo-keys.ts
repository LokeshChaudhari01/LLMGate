import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { db, pool } from "../src/lib/db";
import { apiKeys } from "../src/lib/db/schema";

function hash(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function newKey() {
  return `ag_${randomBytes(32).toString("hex")}`;
}

async function main() {
  const oldPublic = process.env.SITE_DEMO_API_KEY ?? process.env.PUBLIC_DEMO_API_KEY;
  const oldPrivate = process.env.DEMO_API_KEY;
  const publicTenant = process.env.SITE_DEMO_TENANT_ID ?? process.env.PUBLIC_DEMO_TENANT_ID;
  if (!oldPublic || !oldPrivate || !publicTenant) throw new Error("Demo keys and tenant ID must be present in .env");

  const publicRow = (await db.select({ id: apiKeys.id, tenantId: apiKeys.tenantId }).from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash(oldPublic)), eq(apiKeys.isActive, true))).limit(1))[0];
  const privateRow = (await db.select({ id: apiKeys.id, tenantId: apiKeys.tenantId }).from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash(oldPrivate)), eq(apiKeys.isActive, true))).limit(1))[0];
  if (!publicRow || publicRow.tenantId !== publicTenant || !privateRow || privateRow.tenantId === publicTenant) {
    throw new Error("Existing keys do not match the expected public and private tenants");
  }

  const nextPublic = newKey();
  const nextPrivate = newKey();
  await db.transaction(async (tx) => {
    await tx.insert(apiKeys).values([
      { tenantId: publicRow.tenantId, keyHash: hash(nextPublic), description: "Public site playground" },
      { tenantId: privateRow.tenantId, keyHash: hash(nextPrivate), description: "Private dashboard playground" },
    ]);
    await tx.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, publicRow.id));
    await tx.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, privateRow.id));
  });

  const path = resolve(process.cwd(), ".env");
  let source = readFileSync(path, "utf8");
  source = source.split("\n").filter((line) => !/^PUBLIC_DEMO_(API_KEY|TENANT_ID)=/.test(line)).join("\n");
  for (const [name, value] of Object.entries({ SITE_DEMO_TENANT_ID: publicTenant, SITE_DEMO_API_KEY: nextPublic, DEMO_API_KEY: nextPrivate })) {
    const pattern = new RegExp(`^${name}=.*$`, "m");
    source = pattern.test(source) ? source.replace(pattern, `${name}=${value}`) : `${source.trimEnd()}\n${name}=${value}\n`;
  }
  writeFileSync(path, source, { mode: 0o600 });
  console.log("Demo keys rotated in Neon and saved to ignored local .env. Raw values were not printed.");
}

main().catch((error: Error) => {
  console.error(`Demo key rotation failed: ${error.message}`);
  process.exitCode = 1;
}).finally(() => pool.end());
