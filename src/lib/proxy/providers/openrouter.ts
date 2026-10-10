import type { LLMProvider, StreamRequest } from "./types";
import { OPENROUTER_FREE_MODELS } from "@/lib/openrouter-models";

/** OpenRouter's chat-completions stream uses the same SSE shape as Groq. */
export const openrouterProvider: LLMProvider = {
  name: "openrouter",

  async stream(request: StreamRequest, signal: AbortSignal): Promise<Response> {
    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`,
        "HTTP-Referer": "https://llmgate-ai-gateway.vercel.app",
        "X-OpenRouter-Title": "LLMGate",
      },
      body: JSON.stringify({
        model: request.model,
        models: OPENROUTER_FREE_MODELS.filter((model) => model !== request.model),
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: request.maxOutputTokens,
      }),
      signal,
    });
  },
};
