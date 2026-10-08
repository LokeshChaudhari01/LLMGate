// Paid standard text-token prices per 1M tokens, checked in October 2026.
// https://ai.google.dev/gemini-api/docs/pricing
// https://console.groq.com/docs/models
interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const PRICING: Record<string, ModelPricing> = {
  "gemini-2.5-flash": { inputPer1M: 0.30, outputPer1M: 2.50 },
  "gemini-3.5-flash": { inputPer1M: 1.50, outputPer1M: 9.00 },
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10.00 },
  "openai/gpt-oss-120b": { inputPer1M: 0.15, outputPer1M: 0.60 },
};

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): string {
  const pricing = PRICING[model];
  if (!pricing) throw new Error(`No price configured for model ${model}`);
  if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens) || promptTokens < 0 || completionTokens < 0) {
    throw new Error("Token counts must be non-negative finite numbers");
  }

  const inputCost  = (promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPer1M;
  const totalCost  = inputCost + outputCost;

  // Round up to a micro-dollar so small requests are represented in the ledger.
  return (Math.ceil(totalCost * 1_000_000) / 1_000_000).toFixed(6);
}
