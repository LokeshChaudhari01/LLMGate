import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "LLMGate | Intelligent AI request routing",
  description: "Route AI requests across models while controlling budgets, caching repeat prompts, and tracking usage.",
};

const features = [
  { title: "Intelligent Model Routing", description: "Automatically selects a suitable AI model based on request complexity." },
  { title: "Cost & Budget Control", description: "Enforces tenant spending limits and per-key rate limits." },
  { title: "Smart Response Caching", description: "Reuses answers to identical prompts within a tenant to avoid unnecessary model calls." },
  { title: "Automatic Provider Failover", description: "Retries with a fallback provider when the selected provider fails before streaming begins." },
  { title: "Usage Analytics", description: "Tracks token usage, request latency, model selection, and estimated costs." },
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
              <span>Smarter AI routing.</span>
              <span className={styles.headlineAccent}>Lower costs.</span>
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
              {features.map((feature, index) => (
                <li key={feature.title} className={`${styles.featureCard} ${index === 0 ? styles.featureCardLead : ""}`}>
                  <div className={styles.featureText}>
                    <div className={styles.featureContent}>
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                  </div>
                  {index === 0 && (
                    <div className={styles.routingVisual} aria-hidden="true">
                      {["Simple", "Coding", "Complex"].map((kind) => (
                        <div key={kind} className={styles.routingLane}>
                          <span>{kind}</span>
                          <span className={styles.routingTrack} />
                        </div>
                      ))}
                    </div>
                  )}
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
