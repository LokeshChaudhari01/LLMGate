"use client";

import { useEffect, useRef, useState } from "react";
import { readGatewayStream } from "@/lib/demo/read-stream";
import { routingLabel, sampleScenarios, type DemoTrace, type SampleScenario } from "@/lib/demo/sample-data";

type Mode = "public" | "admin";
type Availability = { enabled: boolean; available: boolean; globalRemaining: number; visitorUsed?: boolean };

export function QueryWorkbench({ mode }: { mode: Mode }) {
  const isPublic = mode === "public";
  const maxLength = isPublic ? 350 : 4000;
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [trace, setTrace] = useState<DemoTrace | null>(null);
  const [sample, setSample] = useState<SampleScenario | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [requestId, setRequestId] = useState("");
  const [cache, setCache] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stopped, setStopped] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  async function refreshAvailability() {
    if (!isPublic) return;
    try {
      const response = await fetch("/api/demo/query", { cache: "no-store" });
      const data: Availability = await response.json();
      setAvailability(data);
    } catch {
      setAvailability({ enabled: true, available: false, globalRemaining: 0 });
    }
  }

  useEffect(() => {
    let active = true;
    if (isPublic) {
      fetch("/api/demo/query", { cache: "no-store" })
        .then((response) => response.json() as Promise<Availability>)
        .then((data) => { if (active) setAvailability(data); })
        .catch(() => { if (active) setAvailability({ enabled: true, available: false, globalRemaining: 0 }); });
    }
    return () => { active = false; controllerRef.current?.abort(); };
  }, [isPublic]);

  function showSample(item: SampleScenario) {
    if (runningRef.current) return;
    setSample(item);
    setPrompt(item.prompt);
    setAnswer(item.answer);
    setTrace(item.trace);
    setRequestId(item.trace.requestId);
    setCache(item.trace.cacheHit ? "HIT" : "MISS");
    setError("");
    setStopped(false);
  }

  function writeQuestion() {
    setSample(null);
    setAnswer("");
    setTrace(null);
    setRequestId("");
    setCache("");
    setError("");
    setPrompt("");
    inputRef.current?.focus();
  }

  async function submit() {
    if (runningRef.current) return;
    const question = prompt.trim();
    if (!question || question.length > maxLength) {
      setError(`Enter a question of up to ${maxLength.toLocaleString()} characters.`);
      inputRef.current?.focus();
      return;
    }
    if (isPublic && !availability?.available) return;

    runningRef.current = true;
    setBusy(true);
    setSample(null);
    setAnswer("");
    setTrace(null);
    setRequestId("");
    setCache("");
    setError("");
    setStopped(false);
    const controller = new AbortController();
    controllerRef.current = controller;
    let completed = false;
    let streamError = "";

    try {
      const response = await fetch(isPublic ? "/api/demo/query" : "/api/admin/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data: { error?: string } = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `The request failed (${response.status}).`);
      }
      setRequestId(response.headers.get("X-Request-ID") ?? "");
      setCache(response.headers.get("X-Cache") ?? "");
      if (!response.body) throw new Error("The response stream was empty. Please retry.");
      await readGatewayStream(response.body, (event) => {
        if (event.type === "text") setAnswer((current) => current + event.content);
        if (event.type === "meta") setTrace(event.trace);
        if (event.type === "error") streamError = event.message;
        if (event.type === "done") completed = true;
      });
      if (streamError) throw new Error(streamError);
      if (!completed) throw new Error("The response ended early. Please retry later.");
    } catch (cause) {
      if (controller.signal.aborted) {
        setStopped(true);
      } else {
        setError(cause instanceof Error ? cause.message : "The request failed. Please retry.");
      }
    } finally {
      controllerRef.current = null;
      runningRef.current = false;
      setBusy(false);
      if (isPublic) void refreshAvailability();
    }
  }

  const liveUnavailable = isPublic && availability?.available !== true;
  const availabilityText = !isPublic
    ? "Private playground · Gateway usage is recorded in the admin dashboard."
    : availability === null
      ? "Checking today's live allowance…"
      : !availability.enabled
        ? "Live questions are not configured yet. Saved examples are ready below."
        : availability.visitorUsed
          ? "You've used today's live question. Saved examples are always available."
          : availability.globalRemaining === 0
            ? "Today's live allowance is full. Saved examples are always available."
            : availability.available
              ? `One live question per visitor today · ${availability.globalRemaining} available across the site.`
              : "This connection has reached today's live allowance. Saved examples are available.";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
      <div className="space-y-6">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6" aria-labelledby="question-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 id="question-heading" className="text-lg font-semibold text-white">Ask a question</h2><p className="mt-1 text-sm text-zinc-400">{isPublic ? "One short question, answered through the live gateway." : "Send a question through the same gateway as an application client."}</p></div>
            {sample && <span className="rounded-full border border-blue-800 bg-blue-950 px-3 py-1 text-xs text-blue-300">Saved example</span>}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void submit(); }} noValidate className="mt-5">
            <label htmlFor="gateway-question" className="mb-2 block text-sm font-medium text-zinc-200">Your question</label>
            <textarea
              ref={inputRef}
              id="gateway-question"
              value={prompt}
              onChange={(event) => { setPrompt(event.target.value); if (sample) { setSample(null); setAnswer(""); setTrace(null); setRequestId(""); setCache(""); } setError(""); }}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }}
              maxLength={maxLength}
              rows={4}
              disabled={busy}
              aria-invalid={Boolean(error)}
              aria-describedby="question-help question-error"
              placeholder="Ask about an API, a coding problem, or a system design choice…"
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-70"
            />
            <div id="question-help" className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-zinc-500"><span>Enter to send · Shift+Enter for a new line</span><span>{prompt.length}/{maxLength}</span></div>
            <p id="question-error" role={error ? "alert" : undefined} className="mt-2 min-h-5 text-sm text-red-400">{error}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {busy ? (
                <button type="button" onClick={() => controllerRef.current?.abort()} className="min-w-36 cursor-pointer rounded-lg border border-zinc-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Stop response</button>
              ) : (
                <button type="submit" disabled={Boolean(liveUnavailable) || !prompt.trim()} className="min-w-36 cursor-pointer rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-45">Send question</button>
              )}
              <span className="text-xs text-zinc-500" role="status">{availabilityText}</span>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6" aria-labelledby="answer-heading">
          <div className="flex items-center justify-between gap-3"><h2 id="answer-heading" className="text-lg font-semibold text-white">Answer</h2><span className="text-xs text-zinc-500">{sample ? "Saved example · No API call" : busy ? "Streaming" : answer ? "Complete" : "Ready"}</span></div>
          <div className="mt-5 min-h-40 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm leading-7 text-zinc-200" aria-live="polite" aria-atomic="false">
            {answer || (busy ? "Waiting for the model to respond…" : "Choose a saved example or send your own question to see the response here.")}
          </div>
          {stopped && <p className="mt-3 text-sm text-amber-300" role="status">Response stopped. A live question may still count toward today&apos;s allowance.</p>}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6" aria-labelledby="examples-heading">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="examples-heading" className="text-lg font-semibold text-white">Explore saved examples</h2><p className="mt-1 text-sm text-zinc-400">These fixed scenarios show routing, caching, and failover without using API quota.</p></div><button type="button" onClick={writeQuestion} disabled={busy} className="cursor-pointer text-sm text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50">Write your own</button></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {sampleScenarios.map((item) => <button key={item.id} type="button" onClick={() => showSample(item)} disabled={busy} className={`cursor-pointer rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${sample?.id === item.id ? "border-blue-500 bg-blue-950/40" : "border-zinc-700 bg-zinc-950 hover:border-zinc-500"}`}><span className="block font-mono text-[11px] uppercase tracking-wide text-blue-400">{item.category}</span><span className="mt-1 block text-sm font-medium text-zinc-100">{item.title}</span></button>)}
          </div>
        </section>
      </div>

      <aside className="self-start rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6" aria-labelledby="trace-heading">
        <div className="flex items-center justify-between gap-3"><h2 id="trace-heading" className="text-lg font-semibold text-white">Gateway trace</h2><span className="rounded-full border border-zinc-700 px-2.5 py-1 font-mono text-[10px] uppercase text-zinc-400">{sample ? "Sample" : trace ? "Live" : "Waiting"}</span></div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">A request passes through access, routing, response, and usage recording.</p>
        <dl className="mt-5 divide-y divide-zinc-800 text-sm">
          <TraceRow label="Request" value={requestId ? requestId.slice(0, 12) : "—"} mono />
          <TraceRow label="Access" value={sample ? "Illustrative key check" : trace || busy ? "Demo key checked" : "—"} />
          <TraceRow label="Route" value={trace ? routingLabel(trace.routingReason) : busy ? "Choosing model…" : "—"} />
          <TraceRow label="Provider" value={trace?.provider ?? "—"} />
          <TraceRow label="Model" value={trace?.model ?? "—"} mono />
          <TraceRow label="Cache" value={trace ? trace.cacheHit ? "Hit · no model call" : "Miss" : cache || "—"} />
          <TraceRow label="Fallback" value={trace ? trace.failoverUsed ? "Used" : "Not needed" : "—"} />
          <TraceRow label="Response time" value={trace ? `${trace.latencyMs.toLocaleString()} ms` : "—"} mono />
          <TraceRow label="Tokens" value={trace ? `${trace.promptTokens} in · ${trace.completionTokens} out` : "—"} mono />
          <TraceRow label="Est. model cost" value={trace ? `$${trace.estimatedCostUsd}` : "—"} mono />
          <TraceRow label="Sensitive patterns" value={trace ? trace.piiRedacted ? "Redacted before routing" : "None detected" : "—"} />
        </dl>
        <p className="mt-5 text-xs leading-5 text-zinc-500">Cost uses the gateway&apos;s saved model prices. It is an estimate, not a provider invoice. Saved example values are illustrative.</p>
      </aside>
    </div>
  );
}

function TraceRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-4 py-3"><dt className="shrink-0 text-zinc-500">{label}</dt><dd className={`min-w-0 break-words text-right text-zinc-200 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>;
}
