import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { QueryWorkbench } from "@/components/query-workbench";

export const metadata: Metadata = {
  title: "Try the Gateway | LLMGate",
  description: "Ask one live question or explore saved gateway routing examples.",
};

export default function TryGatewayPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-blue-400">Public playground</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Ask a question. Inspect the route.</h1>
        <p className="mb-8 mt-3 max-w-2xl text-zinc-400">One live question shows the gateway in action. Saved examples remain available when the live daily allowance is full.</p>
        <QueryWorkbench mode="public" />
      </main>
    </div>
  );
}
