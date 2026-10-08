-- Reserve a bounded amount before an upstream request, then reconcile it
-- against provider-reported usage in the telemetry worker.
ALTER TABLE "tenants" ALTER COLUMN "budget_usd" TYPE numeric(19, 6);
ALTER TABLE "usage_logs" ALTER COLUMN "cost_usd" TYPE numeric(19, 6);

CREATE TABLE "budget_reservations" (
  "request_id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "amount_usd" numeric(19, 6) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "idx_budget_reservations_created_at"
  ON "budget_reservations" ("created_at");
