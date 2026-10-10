import assert from "node:assert/strict";
import { test } from "node:test";
import { selectProvider } from "../src/lib/proxy/cost-router";
import { sanitizeMessages } from "../src/lib/proxy/pii-scrubber";
import { calculateCost } from "../src/lib/queue/cost-calculator";
import { modelLabel } from "../src/lib/model-label";
import { OPENROUTER_FREE_MODELS } from "../src/lib/openrouter-models";
import type { LLMProvider, StreamResult } from "../src/lib/proxy/providers/types";
import { openrouterProvider } from "../src/lib/proxy/providers/openrouter";

test("automatic model selection handles simple, coding, and complex prompts", () => {
  const message = (content: string) => [{ role: "user" as const, content }];
  assert.equal(selectProvider(message("Hello"), "auto").model, "gemini-2.5-flash");
  assert.equal(selectProvider(message("Debug this TypeScript function with an async import error")).model, "openai/gpt-oss-120b");
  assert.equal(selectProvider(message("Debug this TypeScript function with an async import error"), undefined, false).model, "gemini-2.5-flash");
  const complex = selectProvider(message("Analyze the architecture and scalability tradeoffs in detail"));
  assert.equal(complex.model, "google/gemma-4-31b-it:free");
  assert.equal(complex.providerName, "openrouter");
  assert.equal(selectProvider(message("Hello"), "google/gemma-4-31b-it:free").providerName, "openrouter");
  assert.equal(modelLabel(complex.model), "OpenRouter");
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
  assert.equal(calculateCost("google/gemma-4-31b-it:free", 1_000, 1_000), "0.000000");
  assert.ok(OPENROUTER_FREE_MODELS.every((model) => calculateCost(model, 1_000, 1_000) === "0.000000"));
  assert.equal(calculateCost("openai/gpt-oss-120b", 1_000, 1_000), "0.000750");
  assert.throws(() => calculateCost("unknown", 1_000, 1_000));
});

test("OpenRouter telemetry records the free model that actually streamed", async () => {
  process.env.DATABASE_URL ||= "postgresql://localhost/test";
  const { createProxyStream } = await import("../src/lib/proxy/stream-handler");
  const actualModel = OPENROUTER_FREE_MODELS[1];
  const provider: LLMProvider = {
    name: "openrouter",
    async stream() {
      return new Response(
        `data: ${JSON.stringify({ model: actualModel, choices: [{ delta: { content: "A useful answer." } }] })}\n\n` +
        `data: ${JSON.stringify({ model: actualModel, choices: [], usage: { prompt_tokens: 12, completion_tokens: 5 } })}\n\n` +
        "data: [DONE]\n\n",
        { status: 200 }
      );
    },
  };
  let completed: StreamResult | undefined;
  const stream = createProxyStream(
    "test-openrouter-route",
    [{ role: "user", content: "Analyze this design" }],
    { provider, model: OPENROUTER_FREE_MODELS[0], apiKey: "test", timeoutMs: 1000 },
    { provider, model: OPENROUTER_FREE_MODELS[0], apiKey: "test", timeoutMs: 1000 },
    "complexity_score_high",
    async (result) => { completed = result; },
    undefined,
    { emitMetadata: true }
  );
  const output = await new Response(stream).text();
  assert.equal(completed?.model, actualModel);
  assert.match(output, new RegExp(`"model":"${actualModel}"`));
  assert.match(output, /data: \[DONE\]/);
});

test("OpenRouter sends only free models and streams usage", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedBody: Record<string, unknown> = {};
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedBody = JSON.parse(String(init?.body));
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-key");
    return new Response("data: [DONE]\n\n", { status: 200 });
  };
  try {
    await openrouterProvider.stream({
      model: OPENROUTER_FREE_MODELS[0],
      messages: [{ role: "user", content: "Analyze this design" }],
      apiKey: "test-key",
      maxOutputTokens: 512,
    }, new AbortController().signal);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(requestedUrl, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(requestedBody.model, OPENROUTER_FREE_MODELS[0]);
  assert.deepEqual(requestedBody.models, OPENROUTER_FREE_MODELS.slice(1));
  assert.ok(OPENROUTER_FREE_MODELS.length <= 4);
  assert.equal(requestedBody.stream, true);
  assert.deepEqual(requestedBody.stream_options, { include_usage: true });
  assert.deepEqual(requestedBody.reasoning, { enabled: false });
});
