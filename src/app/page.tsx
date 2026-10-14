import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "LLMGate | Intelligent AI request routing",
  description: "Route AI requests across models while controlling budgets, caching repeat prompts, and tracking usage.",
};

const features = [
  { label: "MODEL ROUTING", title: "Choose the right model", description: "Automatically route simple, coding, and complex prompts across three providers using a deterministic score." },
  { label: "SPENDING GUARDRAILS", title: "Set limits before inference", description: "Reserve tenant budget before provider calls and rate limit each API key." },
  { label: "EXACT-MATCH CACHE", title: "Skip repeat model calls", description: "Return eligible exact-match answers from a tenant-scoped Redis cache without another provider call." },
  { label: "PROVIDER FAILOVER", title: "Recover before streaming", description: "If a provider fails before streaming starts, try one fallback model." },
  { label: "REQUEST ANALYTICS", title: "See where usage goes", description: "Inspect model choices, token counts, latency, and estimated cost in the dashboard." },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="LLMGate home">LLM<span>Gate</span></Link>
          <Link href="/admin-login" className={styles.adminLink}>
            Admin sign in
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={styles.adminArrow}>
              <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </header>

      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true" className={styles.eyebrowRule} />AI GATEWAY · MODEL ROUTING</p>
            <h1 id="hero-title" className={styles.headline}>
              <span>One gateway.</span>
              <span>Every AI request.</span>
              <span className={styles.headlineAccent}>Smarter by design.</span>
            </h1>
            <p className={styles.heroDescription}>Intelligently route AI requests while keeping costs and usage under control.</p>
            <div className={styles.actions}>
              <Link href="/try" className={styles.primaryAction}>
                Try the gateway
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <Link href="/sample-dashboard" className={styles.secondaryAction}>Explore sample dashboard</Link>
            </div>
            <p className={styles.demoNote}>No account needed. The public demo allows one live question per browser each day.</p>
          </div>

          <section className={styles.featureStack} aria-labelledby="features-title">
            <div className={styles.featureStackHeader}>
              <span aria-hidden="true" className={styles.stackRule} />
              <h2 id="features-title">Built into the gateway</h2>
            </div>
            <ul className={styles.featureList}>
              {features.map((feature) => (
                <li key={feature.title} className={styles.featureCard}>
                  <span className={styles.featureLabel}>{feature.label}</span>
                  <div className={styles.featureContent}>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </section>
      </main>

      <footer className={styles.footer}><span>LLMGate</span><span>AI infrastructure, with the decisions visible.</span></footer>
    </div>
  );
}
