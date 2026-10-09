export type DemoTrace = {
  requestId: string;
  provider: string;
  model: string;
  routingReason: string;
  failoverUsed: boolean;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: string;
  cacheHit: boolean;
  piiRedacted: boolean;
};

export type SampleScenario = {
  id: string;
  category: string;
  title: string;
  prompt: string;
  answer: string;
  trace: DemoTrace;
};

// Illustrative, fixed scenarios. They never call a model and never appear in
// real usage analytics. Keep the "sample" label visible wherever used.
export const sampleScenarios: SampleScenario[] = [
  {
    id: "simple",
    category: "Simple request",
    title: "A direct answer",
    prompt: "What does a database index do?",
    answer: "A database index helps the database find rows without scanning an entire table. It speeds up reads for indexed columns, while adding some storage and write overhead.",
    trace: { requestId: "sample-001", provider: "Gemini", model: "gemini-2.5-flash", routingReason: "simple_query", failoverUsed: false, latencyMs: 780, promptTokens: 14, completionTokens: 38, estimatedCostUsd: "0.000100", cacheHit: false, piiRedacted: false },
  },
  {
    id: "coding",
    category: "Coding request",
    title: "A model chosen for code",
    prompt: "Why does this JavaScript Promise.all fail when one request rejects?",
    answer: "Promise.all rejects as soon as one input promise rejects, so the combined await throws even if other requests succeed. Use Promise.allSettled when you need every result and want to handle failures individually.",
    trace: { requestId: "sample-002", provider: "Groq", model: "openai/gpt-oss-120b", routingReason: "coding_query", failoverUsed: false, latencyMs: 620, promptTokens: 24, completionTokens: 45, estimatedCostUsd: "0.000031", cacheHit: false, piiRedacted: false },
  },
  {
    id: "cached",
    category: "Cache hit",
    title: "The same answer, without a model call",
    prompt: "What does a database index do?",
    answer: "A database index helps the database find rows without scanning an entire table. It speeds up reads for indexed columns, while adding some storage and write overhead.",
    trace: { requestId: "sample-003", provider: "Gemini", model: "gemini-2.5-flash", routingReason: "cache_hit", failoverUsed: false, latencyMs: 28, promptTokens: 14, completionTokens: 38, estimatedCostUsd: "0.000000", cacheHit: true, piiRedacted: false },
  },
  {
    id: "complex",
    category: "Complex request",
    title: "More reasoning when it helps",
    prompt: "Compare the tradeoffs of a shared queue and per-tenant queues for an AI gateway.",
    answer: "A shared queue is simpler to operate and makes spare capacity available to every tenant. Per-tenant queues offer clearer isolation and fairness, but require more scheduling and monitoring. A small gateway can start shared and add tenant-aware limits before splitting queues.",
    trace: { requestId: "sample-004", provider: "Gemini", model: "gemini-2.5-pro", routingReason: "complex_query", failoverUsed: false, latencyMs: 1420, promptTokens: 30, completionTokens: 59, estimatedCostUsd: "0.000628", cacheHit: false, piiRedacted: false },
  },
  {
    id: "failover",
    category: "Failover",
    title: "A fallback keeps the request moving",
    prompt: "Summarize why retries need limits.",
    answer: "Retries can recover from brief failures, but unlimited retries can overload a struggling service. Limit attempts, add a timeout, and use a fallback only when it can still return a useful response.",
    trace: { requestId: "sample-005", provider: "Gemini", model: "gemini-2.5-flash", routingReason: "fallback_provider", failoverUsed: true, latencyMs: 1890, promptTokens: 17, completionTokens: 43, estimatedCostUsd: "0.000113", cacheHit: false, piiRedacted: false },
  },
];

export function routingLabel(reason: string): string {
  const labels: Record<string, string> = {
    simple_query: "Simple question",
    coding_query: "Coding question",
    complex_query: "Complex question",
    cache_hit: "Cached answer",
    fallback_provider: "Fallback provider",
    explicit_model: "Requested model",
  };
  return labels[reason] ?? reason.replaceAll("_", " ");
}
