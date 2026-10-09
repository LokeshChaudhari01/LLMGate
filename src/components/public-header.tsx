import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
          LLM<span className="text-blue-400">Gate</span>
        </Link>
        <nav aria-label="Public" className="flex flex-wrap items-center gap-1 text-sm">
          <Link href="/try" className="rounded-lg px-3 py-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Try the gateway</Link>
          <Link href="/sample-dashboard" className="rounded-lg px-3 py-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Sample dashboard</Link>
          <Link href="/admin-login" className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-200 transition-colors hover:border-blue-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Admin sign in</Link>
        </nav>
      </div>
    </header>
  );
}
