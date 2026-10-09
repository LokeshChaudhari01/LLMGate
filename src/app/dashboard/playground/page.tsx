import type { Metadata } from "next";
import { QueryWorkbench } from "@/components/query-workbench";

export const metadata: Metadata = {
  title: "Query Playground | LLMGate Admin",
};

export default function AdminPlaygroundPage() {
  return (
    <main>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-blue-400">Private workspace</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Query playground</h1>
      <p className="mb-8 mt-3 text-zinc-400">Send a live request, inspect the route, and follow its usage in your admin analytics.</p>
      <QueryWorkbench mode="admin" />
    </main>
  );
}
