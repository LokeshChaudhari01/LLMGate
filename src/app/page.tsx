import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

const steps = [
  { number: "01", name: "Access", detail: "The gateway checks the key and tenant budget." },
  { number: "02", name: "Route", detail: "The question is classified and sent to a suitable model." },
  { number: "03", name: "Respond", detail: "The answer streams back while usage is recorded." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <PublicHeader />
      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-24">
          <div>
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.22em] text-blue-400">One entry point · multiple models</p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
              Every AI request has a route.
              <span className="block text-zinc-400">See the route it took.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
              LLMGate sits between an application and its AI providers. It checks access, controls usage, chooses a model, streams the answer, and records what happened.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/try" className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Try a question</Link>
              <Link href="/sample-dashboard" className="rounded-lg border border-zinc-700 px-5 py-3 font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Explore sample telemetry</Link>
            </div>
            <p className="mt-5 text-sm text-zinc-500">No account needed for the public demo. Live questions have a daily allowance.</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 font-mono text-xs text-zinc-500">
              <span>REQUEST TRACE</span><span>ILLUSTRATIVE</span>
            </div>
            <div className="px-6 py-6">
              <div className="mb-7 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-200">“Why does Promise.all stop on a rejection?”</div>
              <ol className="space-y-0">
                {steps.map((step, index) => (
                  <li key={step.number} className="relative flex gap-4 pb-8 last:pb-0">
                    {index < steps.length - 1 && <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-zinc-700" />}
                    <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-blue-500/60 bg-blue-950 font-mono text-[10px] text-blue-300">{step.number}</span>
                    <div><p className="font-medium text-zinc-100">{step.name}</p><p className="mt-1 text-sm leading-6 text-zinc-400">{step.detail}</p></div>
                  </li>
                ))}
              </ol>
              <div className="mt-7 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-6 text-sm">
                <div><span className="block text-xs text-zinc-500">Selected model</span><span className="mt-1 block font-mono text-blue-300">gpt-oss-120b</span></div>
                <div><span className="block text-xs text-zinc-500">Why</span><span className="mt-1 block text-zinc-200">Coding question</span></div>
              </div>
            </div>
          </div>
        </section>
        <section className="border-t border-zinc-800 bg-zinc-900/40">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-3">
            <div><h2 className="font-semibold text-white">Budget-aware</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Tenant budgets are reserved before a provider call, then settled against recorded usage.</p></div>
            <div><h2 className="font-semibold text-white">Cache-aware</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Repeated questions can return from Redis without another model call.</p></div>
            <div><h2 className="font-semibold text-white">Inspectable</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Routing, latency, token usage, and estimated cost appear in the private operations dashboard.</p></div>
          </div>
        </section>
      </main>
    </div>
  );
}
