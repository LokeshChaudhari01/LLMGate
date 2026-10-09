CREATE TABLE IF NOT EXISTS "public_demo_quota" (
  "day" date NOT NULL,
  "scope" varchar(16) NOT NULL,
  "identity" varchar(64) NOT NULL,
  "used" integer NOT NULL DEFAULT 0,
  CONSTRAINT "public_demo_quota_pkey" PRIMARY KEY ("day", "scope", "identity")
);
