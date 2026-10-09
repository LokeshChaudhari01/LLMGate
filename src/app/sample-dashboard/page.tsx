import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { routingLabel, sampleScenarios } from "@/lib/demo/sample-data";

const volume = [
  { label: "Mon", value: 42 }, { label: "Tue", value: 36 }, { label: "Wed", value: 51 },
  { label: "Thu", value: 44 }, { label: "Fri", value: 39 }, { label: "Sat", value: 28 },
];

const metrics = [
  { label: "Requests", value: "240", detail: "Across six sample days" },
  { label: "Cache hits", value: "86", detail: "35.8% avoided a model call" },
  { label: "Failovers", value: "3", detail: "Fallback model took over" },
  { label: "Estimated cost", value: "$0.43", detail: "Illustrative token pricing" },
];

export const metadata: Metadata = {
  title: "Sample Dashboard | LLMGate",
  description: "Explore illustrative routing, caching, failover, and cost telemetry.",
};

export default function SampleDashboard() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-blue-400">Public preview</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Sample operations dashboard</h1>
            <p className="mt-3 max-w-2xl text-zinc-400">This is a fixed, illustrative dataset. The real dashboard is private and shows actual gateway usage, tenant budgets, and API keys.</p>
          </div>
          <Link href="/try" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Try a question</Link>
        </div>
        <div role="note" className="mt-8 rounded-lg border border-blue-900 bg-blue-950/40 px-4 py-3 text-sm text-blue-200">Sample data only · No visitor or customer requests are displayed here.</div>

        <section aria-label="Sample metrics" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <article key={item.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-sm text-zinc-400">{item.label}</p>
              <p className="mt-3 font-mono text-3xl font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-xs text-zinc-500">{item.detail}</p>
            </article>
          ))}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6" aria-labelledby="volume-heading">
            <div className="flex items-baseline justify-between gap-4"><h2 id="volume-heading" className="font-semibold text-white">Request volume</h2><span className="text-xs text-zinc-500">Sample six-day window</span></div>
            <div className="mt-8 flex h-52 items-end gap-3 border-b border-zinc-700 pb-1 sm:gap-5">
              {volume.map((day) => (
                <div key={day.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="font-mono text-xs text-zinc-300">{day.value}</span>
                  <div className="w-full max-w-16 rounded-t-md bg-blue-600" style={{ height: `${(day.value / 51) * 76}%` }} aria-label={`${day.label}: ${day.value} requests`} role="img" />
                  <span className="text-xs text-zinc-500">{day.label}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6" aria-labelledby="mix-heading">
            <h2 id="mix-heading" className="font-semibold text-white">Model routing</h2>
            <p className="mt-2 text-sm text-zinc-500">A gateway can choose a different provider for a different kind of request.</p>
            <div className="mt-8 space-y-6">
              <div><div className="mb-2 flex justify-between text-sm"><span>Gemini</span><span className="font-mono text-zinc-400">150 · 62.5%</span></div><div className="h-2 rounded-full bg-zinc-800"><div className="h-2 w-[62.5%] rounded-full bg-blue-500" /></div></div>
              <div><div className="mb-2 flex justify-between text-sm"><span>Groq</span><span className="font-mono text-zinc-400">90 · 37.5%</span></div><div className="h-2 rounded-full bg-zinc-800"><div className="h-2 w-[37.5%] rounded-full bg-violet-500" /></div></div>
            </div>
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900" aria-labelledby="requests-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-800 px-5 py-5 sm:px-6"><h2 id="requests-heading" className="font-semibold text-white">Example request trace</h2><span className="text-xs text-zinc-500">Five illustrative records</span></div>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="bg-zinc-950/40 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-3 font-medium sm:px-6">Type</th><th className="px-5 py-3 font-medium">Route</th><th className="px-5 py-3 font-medium">Provider / model</th><th className="px-5 py-3 font-medium">Cache</th><th className="px-5 py-3 font-medium">Latency</th><th className="px-5 py-3 font-medium">Est. cost</th></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {sampleScenarios.map((item) => (
                  <tr key={item.id} className="text-zinc-300"><td className="px-5 py-4 sm:px-6">{item.category}</td><td className="px-5 py-4">{routingLabel(item.trace.routingReason)}</td><td className="px-5 py-4 font-mono text-xs">{item.trace.provider} / {item.trace.model}</td><td className="px-5 py-4">{item.trace.cacheHit ? "Hit" : "Miss"}</td><td className="px-5 py-4 font-mono">{item.trace.latencyMs} ms</td><td className="px-5 py-4 font-mono">${item.trace.estimatedCostUsd}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <p className="mt-6 text-sm text-zinc-500">Sample values demonstrate the interface; they are not a report of current production traffic or billing.</p>
      </main>
    </div>
  );
}
