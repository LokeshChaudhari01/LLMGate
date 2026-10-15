import assert from "node:assert/strict";
import test from "node:test";
import { geminiProvider } from "../src/lib/proxy/providers/gemini";
import type { LLMProvider, StreamRequest } from "../src/lib/proxy/providers/types";

test("Gemini applies the public thinking setting only to Flash requests", async () => {
  const originalFetch = globalThis.fetch;
  const bodies: { generationConfig: { maxOutputTokens: number; thinkingConfig?: { thinkingBudget: number } } }[] = [];
  globalThis.fetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response("data: [DONE]\n\n", { status: 200 });
  };

  try {
    const base = { messages: [{ role: "user" as const, content: "Hello" }], apiKey: "test", maxOutputTokens: 1024 };
    await geminiProvider.stream({ ...base, model: "gemini-2.5-flash", geminiThinkingBudget: 0 }, new AbortController().signal);
    await geminiProvider.stream({ ...base, model: "gemini-2.5-flash" }, new AbortController().signal);
    await geminiProvider.stream({ ...base, model: "gemini-3.5-flash", geminiThinkingBudget: 0 }, new AbortController().signal);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(bodies.map((body) => body.generationConfig), [
    { maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
    { maxOutputTokens: 1024 },
    { maxOutputTokens: 1024 },
  ]);
});

test("public thinking setting reaches Gemini on primary and fallback attempts", async () => {
  process.env.DATABASE_URL ||= "postgresql://localhost/test";
  const { createProxyStream } = await import("../src/lib/proxy/stream-handler");
  const seen: StreamRequest[] = [];
  const gemini: LLMProvider = {
    name: "gemini",
    async stream(request) {
      seen.push(request);
      return new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "Complete answer." }] }, finishReason: "STOP" }] })}\n\n`, { status: 200 });
    },
  };
  const unavailable: LLMProvider = {
    name: "groq",
    async stream() { return new Response(null, { status: 503 }); },
  };
  const geminiConfig = { provider: gemini, model: "gemini-2.5-flash", apiKey: "test", timeoutMs: 1000 };
  const unavailableConfig = { provider: unavailable, model: "openai/gpt-oss-120b", apiKey: "test", timeoutMs: 1000 };

  for (const primary of [geminiConfig, unavailableConfig]) {
    const stream = createProxyStream(
      "test-public-gemini-answer",
      [{ role: "user", content: "Explain this" }],
      primary,
      geminiConfig,
      "default_simple",
      async () => {},
      undefined,
      { maxOutputTokens: 1024, geminiThinkingBudget: 0, emitMetadata: true }
    );
    const answer = await new Response(stream).text();
    assert.match(answer, /Complete answer\./);
    assert.match(answer, /"outputLimited":false/);
    assert.match(answer, /data: \[DONE\]/);
  }

  assert.equal(seen.length, 2);
  assert.ok(seen.every((request) => request.maxOutputTokens === 1024 && request.geminiThinkingBudget === 0));
});

test("public and standard Gemini responses have separate cache keys", async () => {
  process.env.REDIS_URL ||= "redis://localhost:6379";
  const { generateCacheKey } = await import("../src/lib/redis/prompt-cache");
  const messages = [{ role: "user", content: "Hello" }];
  const regular = generateCacheKey("tenant", "gemini-2.5-flash", messages, 1, 1024);
  const publicDemo = generateCacheKey("tenant", "gemini-2.5-flash", messages, 1, 1024, 0);
  assert.notEqual(regular, publicDemo);
  assert.equal(regular, generateCacheKey("tenant", "gemini-2.5-flash", messages, 1, 1024, undefined));
});
