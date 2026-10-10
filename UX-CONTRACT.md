# LLMGate UI contract

Visual intent and tokens live in [DESIGN.md](DESIGN.md). This file records the observable behavior of the public playground and private admin experience.

## Access and navigation

- `/`, `/try`, and `/sample-dashboard` are public. The home page has direct links to the try page, sample dashboard, and admin sign-in.
- `/admin-login` authenticates the owner. `/dashboard` and all nested dashboard routes, including the private playground, require the existing admin session.
- The public playground never receives the gateway API key or admin credential. Its server route attaches a dedicated key for a separate low-budget tenant.

## Public query

- Saved examples are fixed, clearly labelled, and available even when live questions are exhausted or unavailable. They do not create usage records.
- A visitor may send one short live question per day. The server also enforces a site-wide daily cap and a small per-IP cap using durable PostgreSQL counters. If quota storage fails, live requests are unavailable.
- A rejected request before a provider call refunds its quota reservation. A stopped or interrupted stream may still count because a provider might have processed it.
- Live responses stream text and conclude with request-specific, safe gateway metadata. Show actual provider/model after failover, cache status, latency, tokens, and estimated cost. Do not display other visitors' requests or private tenant data.
- In loading, quota-exhausted, service-unavailable, error, and stopped states, show an inline explanation and keep saved examples available. Preserve a visitor's prompt on request failure.

## Sample dashboard

- Every sample metric and request row is illustrative. The page never calls private admin APIs or mixes sample and live records.
- The real dashboard remains authenticated. The private playground's requests flow through the same gateway and appear in real analytics after telemetry settles.
- The overview shows the target simple → Gemini Flash, code → Groq, and complex → OpenRouter routes. Recent requests and live traces show the actual model ID and its readable name, even after fallback.

## Interaction

- Send with Enter, insert a newline with Shift+Enter. A Stop button aborts the browser stream. Buttons have busy and disabled states, and errors appear next to the input.
- All public navigation is keyboard accessible, focus remains visible, and text content is rendered as text rather than injected HTML.
