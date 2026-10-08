import assert from "node:assert/strict";
import { test } from "node:test";
import { selectProvider } from "../src/lib/proxy/cost-router";
import { sanitizeMessages } from "../src/lib/proxy/pii-scrubber";
import { calculateCost } from "../src/lib/queue/cost-calculator";

test("automatic model selection handles simple, coding, and complex prompts", () => {
  const message = (content: string) => [{ role: "user" as const, content }];
  assert.equal(selectProvider(message("Hello"), "auto").model, "gemini-2.5-flash");
  assert.equal(selectProvider(message("Debug this TypeScript function with an async import error")).model, "openai/gpt-oss-120b");
  assert.equal(selectProvider(message("Debug this TypeScript function with an async import error"), undefined, false).model, "gemini-2.5-flash");
  assert.equal(selectProvider(message("Analyze the architecture and scalability tradeoffs in detail")).model, "gemini-3.5-flash");
});

test("redacts client-supplied secrets across message roles", () => {
  const result = sanitizeMessages([
    { role: "system", content: "Contact me at alice@example.com" },
    { role: "assistant", content: "password=example123" },
    { role: "user", content: "SSN 123-45-6789, card 4111 1111 1111 1111, phone 555-123-4567" },
  ]);
  assert.equal(result.piiCount, 5);
  assert.ok(result.sanitizedMessages.every((message) => !/alice@example|example123|123-45-6789|4111 1111|555-123/.test(message.content)));
});

test("provider prices are explicit and retain micro-dollar charges", () => {
  assert.equal(calculateCost("gemini-2.5-flash", 1_000, 1_000), "0.002800");
  assert.equal(calculateCost("gemini-3.5-flash", 1_000, 1_000), "0.010500");
  assert.equal(calculateCost("gemini-2.5-pro", 1_000, 1_000), "0.011250");
  assert.equal(calculateCost("openai/gpt-oss-120b", 1_000, 1_000), "0.000750");
  assert.throws(() => calculateCost("unknown", 1_000, 1_000));
});
