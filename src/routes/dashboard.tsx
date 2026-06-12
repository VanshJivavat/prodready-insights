import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ScoreRing";
import { StatusDot } from "@/components/StatusDot";
import type { Status } from "@/lib/mock-data";
import { SpeedTab } from "@/components/tabs/SpeedTab";
import { SecurityTab } from "@/components/tabs/SecurityTab";
import { StressTab } from "@/components/tabs/StressTab";
import { BalancerTab } from "@/components/tabs/BalancerTab";
import { CostTab } from "@/components/tabs/CostTab";
import { ArchitectureTab } from "@/components/tabs/ArchitectureTab";
import { Sparkles, Share2, RotateCw, ArrowLeft, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LicenseGate } from "@/components/LicenseGate";
import { runSecurityAudit, runSpeedAudit } from "@/lib/api/audit.functions";

export const Route = createFileRoute("/dashboard")({
  validateSearch: z.object({ url: z.string().default("https://example.com") }),
  component: Dashboard,
});

function scoreToStatus(score: number): Status {
  return score >= 75 ? "good" : score >= 50 ? "warn" : "bad";
}

function Dashboard() {
  const { url } = Route.useSearch();
  const [active, setActive] = useState("speed");
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [costVisitors, setCostVisitors] = useState(500_000);
  useEffect(() => { setGeneratedAt(new Date().toLocaleString()); }, []);

  const securityFn = useServerFn(runSecurityAudit);
  const speedFn = useServerFn(runSpeedAudit);

  const securityQ = useQuery({
    queryKey: ["security", url],
    queryFn: () => securityFn({ data: { url } }),
    staleTime: 60_000,
  });
  const speedQ = useQuery({
    queryKey: ["speed", url],
    queryFn: () => speedFn({ data: { url } }),
    staleTime: 60_000,
  });

  const modules = useMemo(() => {
    // Security score: % passing checks
    const checks = securityQ.data?.checks ?? [];
    const securityScore = checks.length
      ? Math.round((checks.filter(c => c.pass).length / checks.length) * 100)
      : 50;

    // Speed score: derived from metric statuses
    const metrics = speedQ.data?.metrics ?? [];
    const metricScore = (s: string) => (s === "good" ? 100 : s === "warn" ? 60 : 25);
    const speedScore = metrics.length
      ? Math.round(metrics.reduce((a, m) => a + metricScore(m.status), 0) / metrics.length)
      : 50;

    // Architecture score: % of detected infra nodes
    const nodes = speedQ.data?.archNodes ?? [];
    const archScore = nodes.length
      ? Math.round((nodes.filter(n => n.detected).length / nodes.length) * 100)
      : 50;

    // Stress: based on TTFB
    const ttfb = speedQ.data?.ttfb ?? 0;
    const stressScore = ttfb === 0 ? 50 : ttfb < 300 ? 90 : ttfb < 800 ? 65 : 35;

    // Balancer: cdn/lb presence
    const balancerScore =
      (speedQ.data?.cdnDetected ? 50 : 0) + (speedQ.data?.cloudflareDetected ? 40 : 10);

    // Cost: smaller pages + CDN = cheaper
    const bytes = speedQ.data?.bytes ?? 0;
    const sizeMb = bytes / (1024 * 1024);
    const costScore = Math.max(
      20,
      Math.round(100 - sizeMb * 15 + (speedQ.data?.cdnDetected ? 10 : -10)),
    );

    const list = [
      { id: "speed", label: "Page Speed", score: speedScore },
      { id: "security", label: "Security", score: securityScore },
      { id: "stress", label: "Stress Test", score: stressScore },
      { id: "balancer", label: "Load Balancer", score: Math.min(100, balancerScore) },
      { id: "cost", label: "Cost Projection", score: Math.min(100, costScore) },
      { id: "architecture", label: "Architecture", score: archScore },
    ];
    return list.map(m => ({ ...m, status: scoreToStatus(m.score) }));
  }, [securityQ.data, speedQ.data]);

  const loading = securityQ.isLoading || speedQ.isLoading;
  const overallScore = useMemo(
    () => Math.round(modules.reduce((s, m) => s + m.score, 0) / modules.length),
    [modules],
  );

  const renderTab = () => {
    switch (active) {
      case "speed": return <SpeedTab url={url} />;
      case "security": return <SecurityTab url={url} />;
      case "stress": return <LicenseGate feature="Live Stress Test"><StressTab url={url} /></LicenseGate>;
      case "balancer": return <LicenseGate feature="Load Balancer Simulation"><BalancerTab /></LicenseGate>;
      case "cost": return <CostTab />;
      case "architecture": return <ArchitectureTab url={url} />;
      default: return null;
    }
  };

  const activeLabel = modules.find(m => m.id === active)?.label ?? "";

  return (
    <div className="min-h-screen flex bg-background print-root">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 border-r border-border bg-sidebar flex flex-col no-print">
        <div className="p-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2 font-semibold text-sm">
            <div className="h-7 w-7 rounded-lg bg-primary/15 grid place-items-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            ProdReady
          </Link>
        </div>

        <div className="p-5 border-b border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">URL</div>
          <div className="mt-1 text-xs font-mono truncate" title={url}>{url}</div>
          <div className="mt-5 flex justify-center">
            <ScoreRing score={loading ? 0 : overallScore} />
          </div>
        </div>

        <nav className="p-3 flex-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 pb-2">Modules</div>
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                active === m.id ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <StatusDot status={m.status} />
                <span className="truncate">{m.label}</span>
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{loading ? "…" : m.score}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            toast.success("Report link copied to clipboard");
          }}>
            <Share2 className="h-3.5 w-3.5 mr-2" /> Share Report
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-2" /> Export PDF Report
          </Button>
          <Link to="/analyzing" search={{ url }} className="block">
            <Button variant="default" size="sm" className="w-full justify-start">
              <RotateCw className="h-3.5 w-3.5 mr-2" /> Run Again
            </Button>
          </Link>
          <Link to="/" className="block">
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" /> New audit
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-x-auto">
        <header className="border-b border-border px-8 py-5 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-10 no-print">
          <div>
            <h1 className="text-xl font-bold">{activeLabel}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Module {modules.findIndex(m => m.id === active) + 1} of {modules.length}
            </p>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {modules.map(m => (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2",
                  active === m.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <StatusDot status={m.status} />
                {m.label}
              </button>
            ))}
          </div>
        </header>

        {/* Print-only header */}
        <div className="hidden print-only px-8 pt-8 pb-4 border-b border-border">
          <h1 className="text-2xl font-bold">Web Architecture, Performance, & Security Audit Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Target: <span className="font-mono">{url}</span></p>
          <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>Generated {generatedAt} · Overall score: {overallScore}/100</p>
        </div>

        <div className="p-8 max-w-6xl">
          <div className="screen-only">{renderTab()}</div>

          {/* Full report for print: every section */}
          <div className="hidden print-only space-y-10">
            <section><h2 className="text-lg font-bold mb-3">1. Page Speed</h2><SpeedTab url={url} /></section>
            <section><h2 className="text-lg font-bold mb-3">2. Security Headers</h2><SecurityTab url={url} /></section>
            <section><h2 className="text-lg font-bold mb-3">3. Production Architecture</h2><ArchitectureTab url={url} /></section>
            <section><h2 className="text-lg font-bold mb-3">4. Cost Projection</h2><CostTab /></section>
          </div>
        </div>
      </main>
    </div>
  );
}
