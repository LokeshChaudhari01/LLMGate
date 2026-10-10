/** Human-readable names for model IDs shown in gateway telemetry. */
import { isOpenRouterFreeModel } from "./openrouter-models";

export function modelLabel(model: string): string {
  if (isOpenRouterFreeModel(model)) return "OpenRouter";
  switch (model) {
    case "gemini-2.5-flash": return "Gemini Flash";
    case "gemini-2.5-pro": return "Gemini Pro";
    case "gemini-3.5-flash": return "Gemini 3.5 Flash";
    case "openai/gpt-oss-120b": return "GPT OSS 120B";
    default: return model;
  }
}
