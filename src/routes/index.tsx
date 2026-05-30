import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Gauge, ShieldCheck, Activity, Network, DollarSign, Workflow, ArrowRight, Sparkles,
} from "lucide-react";

const features = [
  { icon: Gauge, title: "Page Speed & Weight", desc: "LCP, FCP, TTFB, and where your bytes go." },
  { icon: ShieldCheck, title: "Security Headers", desc: "HTTPS, HSTS, CSP, CORS, cookie flags — explained." },
  { icon: Activity, title: "Load / Stress Test", desc: "See when your server starts dropping requests." },
  { icon: Network, title: "Load Balancer Sim", desc: "Single point of failure vs. distributed traffic." },
  { icon: DollarSign, title: "Cost Projection", desc: "Your AWS bill at 10k, 100k, and 1M visitors." },
  { icon: Workflow, title: "Architecture Detection", desc: "Inferred stack — and the gaps in it." },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProdReady — See your site the way production sees it" },
      { name: "description", content: "Paste a URL. Get a production audit: speed, security, load behavior, and cost — with plain-English explanations." },
      { property: "og:title", content: "ProdReady — Production readiness for developers" },
      { property: "og:description", content: "Paste a URL. Get a production audit with real-time visualizations." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");

  function run(e: React.FormEvent) {
    e.preventDefault();
    const target = url.trim() || "https://example.com";
    navigate({ to: "/analyzing", search: { url: target } });
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.18_160/0.15),transparent_70%)]" />

      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-semibold">
          <div className="h-7 w-7 rounded-lg bg-primary/15 grid place-items-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          ProdReady
        </div>
        <nav className="text-sm text-muted-foreground hidden md:flex gap-6">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
        </nav>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24">
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Free production audit · no signup required
          </div>
          <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight">
            See your site the way <span className="text-primary">production</span> sees it.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Paste a URL. Get a full audit — speed, security, load behavior, infrastructure gaps —
            with plain-English explanations of what each finding costs you in the real world.
          </p>

          <form onSubmit={run} className="mt-10 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl bg-card/80 border border-border backdrop-blur shadow-2xl">
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="flex-1 h-12 text-base bg-transparent border-0 focus-visible:ring-0 placeholder:text-muted-foreground/70"
              />
              <Button type="submit" size="lg" className="h-12 px-6 font-semibold">
                Run Free Audit <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Tested live. Nothing stored. Works with any public URL.
            </p>
          </form>
        </section>

        <section id="features" className="mt-28">
          <h2 className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">What we check</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => (
              <Card key={f.title} className="p-6 bg-card/60 border-border hover:border-primary/40 transition-colors backdrop-blur">
                <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="how" className="mt-24 text-center">
          <h2 className="text-2xl font-bold">Built for developers shipping their first real product.</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Every metric is paired with a one-line human translation. No jargon without explanation.
          </p>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-6 text-center text-xs text-muted-foreground">
        ProdReady · Production readiness for junior developers
      </footer>
    </div>
  );
}
