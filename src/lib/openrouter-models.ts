// Keep this list free-only. OpenRouter tries the next model when an upstream
// endpoint is rate limited or unavailable.
export const OPENROUTER_FREE_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
] as const;

export const OPENROUTER_PRIMARY_MODEL = OPENROUTER_FREE_MODELS[0];

export function isOpenRouterFreeModel(model: string): boolean {
  return OPENROUTER_FREE_MODELS.some((candidate) => candidate === model);
}
