// =============================================================================
// AuraGate — Multi-Model Cost Router (Phase 6)
// =============================================================================
// Purpose:
//   Determines which LLM model to use using a multi-signal scoring function.
//   Routes between Gemini Flash (simple), Groq GPT OSS 120B (coding), and
//   free OpenRouter models (complex).
//
// Signals:
//   - Code blocks (highest confidence)
//   - Code keywords
//   - Token length bands
//   - Complexity vocabulary
//   - Question depth
//
// Returns RouteDecision consumed by stream-handler.ts.
// =============================================================================

import type { Message, RouteDecision } from "./providers/types";
import { OPENROUTER_PRIMARY_MODEL } from "@/lib/openrouter-models";

const SIGNAL_WEIGHTS = {
  CODE_BLOCK:          40,  // ```...``` present
  CODE_KEYWORDS:        5,  // per keyword match, max 25
  TOKENS_OVER_300:     10,  // estimated tokens 300-600
  TOKENS_OVER_600:     20,  // estimated tokens > 600
  COMPLEXITY_KEYWORDS:  8,  // per keyword match, max 24
  QUESTION_DEPTH:       5,  // multiple "?" or "explain why/how"
};

// A single clear coding term should be enough for short playground questions.
// Word boundaries avoid substring matches such as "class" in "classic".
const CODE_TERMS = /\b(?:code|coding|program|programming|script|function|variable|loop|array|recursion|linked list|data structure|algorithm|bug|debug|exception|stack trace|syntax|compiler|typescript|javascript|python|rust|golang|java|react|next\.?js|node\.?js|sql|graphql|dockerfile|html|css|regex|snippet)\b/;
const TECHNICAL_TERMS = /\b(?:api|endpoint|http|rest|query|database|docker|async|await|interface|json|npm|git)\b/;
const CODE_BLOCK = /```[\s\S]*?```|`[^`\n]+`/;

const COMPLEXITY_KEYWORDS = [
  "architecture", "design", "tradeoff", "compare", "analyze",
  "explain", "difference between", "how does", "why does",
  "system design", "scalability", "performance", "optimize",
  "pros and cons", "best practice", "deep dive", "in detail",
];

export function selectProvider(
  messages: Message[],
  requestedModel?: string,
  groqAvailable = true
): RouteDecision {
  const fullText = messages
    .filter(m => m.role === "user")
    .map(m => m.content)
    .join("\n")
    .toLowerCase();

  const estimatedTokens = Math.ceil(fullText.length / 4);
  
  if (requestedModel && requestedModel !== "auto") {
    return {
      providerName: requestedModel === OPENROUTER_PRIMARY_MODEL ? "openrouter" : "gemini",
      model: requestedModel,
      estimatedTokens,
      routingReason: "user_specified",
      queryType: requestedModel === OPENROUTER_PRIMARY_MODEL ? "complex" : "simple",
      complexityScore: 0,
    };
  }

  let score = 0;

  // Signal 1: Code blocks
  const hasCodeBlock = CODE_BLOCK.test(fullText);
  if (hasCodeBlock) score += SIGNAL_WEIGHTS.CODE_BLOCK;

  // Signal 2: Code keywords
  const hasCodeTerm = CODE_TERMS.test(fullText);
  const hasTechnicalTerm = TECHNICAL_TERMS.test(fullText);
  score += (Number(hasCodeTerm) + Number(hasTechnicalTerm)) * SIGNAL_WEIGHTS.CODE_KEYWORDS;

  // Signal 3: Token count bands
  if (estimatedTokens > 600) score += SIGNAL_WEIGHTS.TOKENS_OVER_600;
  else if (estimatedTokens > 300) score += SIGNAL_WEIGHTS.TOKENS_OVER_300;

  // Signal 4: Complexity keywords
  const complexityMatches = COMPLEXITY_KEYWORDS.filter((kw) =>
    fullText.includes(kw)
  ).length;
  score += Math.min(complexityMatches * SIGNAL_WEIGHTS.COMPLEXITY_KEYWORDS, 24);

  // Signal 5: Question depth
  const questionMarks = (fullText.match(/\?/g) || []).length;
  if (questionMarks >= 3) score += SIGNAL_WEIGHTS.QUESTION_DEPTH;

  // --- Routing Decision ---
  // Technical architecture questions with several complexity signals still
  // belong on OpenRouter; direct coding questions go to Groq even when short.
  const isCoding = hasCodeBlock || hasCodeTerm || (hasTechnicalTerm && score < 24);

  if (isCoding) {
    if (!groqAvailable) {
      return {
        providerName: "gemini",
        model: "gemini-2.5-flash",
        estimatedTokens,
        queryType: "coding",
        complexityScore: score,
        routingReason: "fallback_provider",
      };
    }
    return {
      providerName: "groq",
      model: "openai/gpt-oss-120b",
      estimatedTokens,
      queryType: "coding",
      complexityScore: score,
      routingReason: hasCodeBlock ? "code_block_detected" : "code_keywords",
    };
  }

  if (score >= 24) {
    return {
      providerName: "openrouter",
      model: OPENROUTER_PRIMARY_MODEL,
      estimatedTokens,
      queryType: "complex",
      complexityScore: score,
      routingReason: "complexity_score_high",
    };
  }

  return {
    providerName: "gemini",
    model: "gemini-2.5-flash",
    estimatedTokens,
    queryType: "simple",
    complexityScore: score,
    routingReason: "default_simple",
  };
}
