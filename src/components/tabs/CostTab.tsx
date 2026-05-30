import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { EducationCallout } from "@/components/EducationCallout";
import { costBreakdown } from "@/lib/mock-data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";

const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function CostTab() {
  const [visitors, setVisitors] = useState(500_000);
  const c = costBreakdown(visitors);

  const data = [
    { name: "Unoptimized", compute: c.computeUnoptimized, bandwidth: c.bandwidth },
    { name: "Optimized", compute: c.computeOptimized, bandwidth: c.bandwidth * 0.4 },
  ];

  return (
    <div>
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Expected monthly visitors</h3>
          <span className="text-2xl font-bold tabular-nums">{visitors.toLocaleString()}</span>
        </div>
        <Slider min={1000} max={10_000_000} step={1000} value={[visitors]} onValueChange={v => setVisitors(v[0])} />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>1k</span><span>10M</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <Card className="p-5 bg-card border-border">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Bandwidth</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{fmt(c.bandwidth)}<span className="text-sm text-muted-foreground">/mo</span></div>
        </Card>
        <Card className="p-5 bg-card border-destructive/30">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Compute (unoptimized)</div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-destructive">{fmt(c.computeUnoptimized)}<span className="text-sm text-muted-foreground">/mo</span></div>
        </Card>
        <Card className="p-5 bg-card border-success/30">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Compute (with CDN + cache)</div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-success">{fmt(c.computeOptimized)}<span className="text-sm text-muted-foreground">/mo</span></div>
        </Card>
        <Card className="p-5 bg-card border-primary/40 glow-primary">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Potential savings</div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-primary">{fmt(c.savings)}<span className="text-sm text-muted-foreground">/mo</span></div>
        </Card>
      </div>

      <Card className="mt-4 p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-4">Optimized vs unoptimized</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" />
              <XAxis dataKey="name" stroke="oklch(0.68 0.02 250)" tick={{ fontSize: 12 }} />
              <YAxis stroke="oklch(0.68 0.02 250)" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <RTooltip contentStyle={{ background: "oklch(0.21 0.018 250)", border: "1px solid oklch(0.3 0.02 250)", borderRadius: 8 }} formatter={(v: number) => fmt(v)} />
              <Bar dataKey="compute" stackId="a" fill="oklch(0.62 0.22 25)" name="Compute" radius={[0, 0, 0, 0]} />
              <Bar dataKey="bandwidth" stackId="a" fill="oklch(0.7 0.17 220)" name="Bandwidth" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <EducationCallout title="What your AWS / GCP bill looks like at scale">
        At {visitors.toLocaleString()} visitors a month, going from "no CDN, no caching" to "Cloudflare in front + 60-second
        edge cache on HTML" saves you about <strong>{fmt(c.savings)}/month</strong>. Multiply that across a year and it's the difference
        between a side project that bleeds money and one that funds itself. The optimizations themselves are mostly free — Cloudflare's free tier,
        a 10-line cache-control header.
      </EducationCallout>
    </div>
  );
}
