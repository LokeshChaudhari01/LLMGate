import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { isOpenRouterFreeModel } from "../src/lib/openrouter-models";

const baseUrl = (process.env.DEMO_BASE_URL || "https://llmgate-ai-gateway.vercel.app").replace(/\/$/, "");
const apiKey = process.env.DEMO_API_KEY;

if (!apiKey?.startsWith("ag_")) {
  throw new Error("Set DEMO_API_KEY in your local .env before running the demo.");
}

type DemoResult = {
  provider: string | null;
  model: string | null;
  cache: string | null;
  answer: string;
};

async function sendPrompt(prompt: string): Promise<DemoResult> {
  const response = await fetch(`${baseUrl}/api/v1/proxy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      include_gateway_meta: true,
      max_output_tokens: 512,
    }),
    signal: AbortSignal.timeout(65_000),
  });
  const stream = await response.text();
  if (!response.ok) throw new Error(`Gateway returned HTTP ${response.status}`);
  if (stream.includes("event: error") || !stream.includes("data: [DONE]")) {
    throw new Error("Gateway stream did not complete");
  }

  const answer = stream.split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => {
      try {
        return JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || "";
      } catch {
        return "";
      }
    })
    .join("");

  const lines = stream.split("\n");
  const metadataIndex = lines.findIndex((line, index) =>
    line === "event: gateway-meta" && lines[index + 1]?.startsWith("data: ")
  );
  const metadata = metadataIndex >= 0
    ? JSON.parse(lines[metadataIndex + 1].slice(6)) as { provider?: string; model?: string }
    : null;

  return {
    provider: metadata?.provider ?? response.headers.get("x-auragate-provider"),
    model: metadata?.model ?? response.headers.get("x-auragate-model"),
    cache: response.headers.get("x-cache"),
    answer: answer.trim(),
  };
}

async function main() {
  const nonce = randomUUID();
  const simple = `Say hello in five words. Demo request ${nonce}.`;
  const complex = `Analyze architecture, scalability, performance, and tradeoffs for a small chat service in two sentences. Demo request ${nonce}.`;
  const prompts = [
    { label: "Simple", prompt: simple, model: "gemini-2.5-flash", cache: "MISS" },
    { label: "Cached", prompt: simple, model: "gemini-2.5-flash", cache: "HIT" },
    { label: "Simple 2", prompt: `Name one benefit of caching in one sentence. Demo request ${nonce}.`, model: "gemini-2.5-flash", cache: "MISS" },
    { label: "Coding", prompt: `What does this return? \`\`\`js\nconst add = (a, b) => a + b;\nadd(2, 3);\n\`\`\` Demo request ${nonce}.`, model: "openai/gpt-oss-120b", cache: "MISS" },
    { label: "Coding 2", prompt: `Find the output of this code: \`\`\`python\nprint(sum([2, 3, 5]))\n\`\`\` Demo request ${nonce}.`, model: "openai/gpt-oss-120b", cache: "MISS" },
    { label: "Complex", prompt: complex, model: "openrouter", cache: "MISS" },
    { label: "Complex cached", prompt: complex, model: "openrouter", cache: "HIT" },
    { label: "Complex 2", prompt: `Compare the pros and cons of synchronous and asynchronous processing for a high volume service. Explain performance and scalability effects in two sentences. Demo request ${nonce}.`, model: "openrouter", cache: "MISS" },
  ];

  for (const item of prompts) {
    const result = await sendPrompt(item.prompt);
    if (item.model === "openrouter") {
      assert.equal(result.provider, "openrouter", `${item.label} used an unexpected provider`);
      assert.ok(result.model && isOpenRouterFreeModel(result.model), `${item.label} used an unexpected model`);
    } else {
      assert.equal(result.model, item.model, `${item.label} used an unexpected model`);
    }
    assert.equal(result.cache, item.cache, `${item.label} had an unexpected cache result`);
    console.log(`${item.label}: ${result.provider} / ${result.model} / cache ${result.cache}`);
    console.log(`  ${result.answer.slice(0, 180) || "(No text returned)"}`);
  }
  console.log("Demo passed. Usage may take about a minute to appear after a worker cold start.");
}

main().catch((error: Error) => {
  console.error(`Demo failed: ${error.message}`);
  process.exitCode = 1;
});
