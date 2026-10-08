// =============================================================================
// AuraGate — PII Scrubber (Compiled Regex Constants)
// =============================================================================
// Purpose:
//   Sanitizes user message content before external transmission to LLM
//   providers. Detects common emails, credentials, US SSNs, phone numbers,
//   and payment-card numbers with a Luhn check.
//
// Interactions:
//   - Called by route.ts as step 6 of the proxy pipeline.
//   - Receives messages from the parsed request body.
//   - Returns ScrubResult with sanitized messages + metadata.
//
// Performance:
//   All regex patterns are compiled as module-level constants (AD-5).
//   This prevents regex object re-creation per request under high
//   concurrency — zero per-request allocation overhead.
//
// Scope:
//   Applied to every client-supplied message role.
// =============================================================================

import type { Message, ScrubResult } from "./providers/types";

// ---------------------------------------------------------------------------
// Compiled Regex Constants (module-level — AD-5)
// ---------------------------------------------------------------------------
// These are created ONCE at module load time, not per-request.
// The 'gi' flags: global (all matches) + case-insensitive.
// ---------------------------------------------------------------------------

/**
 * Email addresses: user@domain.tld
 * Conservative pattern — requires @ and at least one dot in domain.
 */
const EMAIL_REGEX = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;

/**
 * Secrets, API keys, passwords, tokens in key=value or key: value format.
 * Matches: api_key=sk_12345, password: hunter2, SECRET=abc, token: xyz
 * Case-insensitive to catch API_KEY, Api-Key, apiKey, etc.
 */
const SECRET_REGEX =
  /(?:api[_-]?key|password|passwd|secret|token|auth[_-]?token|access[_-]?key|private[_-]?key)\s*[=:]\s*\S+/gi;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const PHONE_REGEX = /\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g;
const CARD_REGEX = /\b(?:\d[ -]?){13,19}\b/g;

function isValidCard(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Mapping from regex to its PII type tag for replacement strings.
 * Order matters — more specific patterns should come first.
 */
const PII_PATTERNS: ReadonlyArray<{
  regex: RegExp;
  type: string;
  validate?: (candidate: string) => boolean;
}> = [
  { regex: SECRET_REGEX, type: "SECRET" },
  { regex: EMAIL_REGEX, type: "EMAIL" },
  { regex: SSN_REGEX, type: "SSN" },
  { regex: PHONE_REGEX, type: "PHONE" },
  { regex: CARD_REGEX, type: "CARD", validate: isValidCard },
] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sanitizes messages by detecting and redacting PII in user content.
 *
 * All client-provided roles are scrubbed, including system and assistant.
 *
 * @param messages - The raw conversation messages from the request body
 * @returns ScrubResult with sanitized messages and PII detection metadata
 */
export function sanitizeMessages(messages: Message[]): ScrubResult {
  let totalPiiCount = 0;

  const sanitizedMessages = messages.map((msg) => {
    let content = msg.content;
    let messageHits = 0;

    for (const pattern of PII_PATTERNS) {
      // Reset lastIndex for global regex (stateful in JS)
      pattern.regex.lastIndex = 0;

      content = content.replace(pattern.regex, (match) => {
        if (pattern.validate && !pattern.validate(match)) return match;
        messageHits += 1;
        return `[PII_REDACTED:${pattern.type}]`;
      });
    }

    totalPiiCount += messageHits;

    if (messageHits === 0) {
      return msg; // No changes — return original reference
    }

    return { ...msg, content };
  });

  return {
    sanitizedMessages,
    piiDetected: totalPiiCount > 0,
    piiCount: totalPiiCount,
  };
}
