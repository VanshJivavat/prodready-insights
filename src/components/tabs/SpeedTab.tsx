import { speedMetrics, waterfall } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { InfoTip } from "@/components/InfoTip";
import { EducationCallout } from "@/components/EducationCallout";
import { StatusDot } from "@/components/StatusDot";
import { cn } from "@/lib/utils";

const typeColor: Record<string, string> = {
  doc: "bg-chart-2",
  js: "bg-chart-3",
  css: "bg-chart-1",
  img: "bg-chart-5",
  font: "bg-chart-4",
};

export function SpeedTab() {
  const maxEnd = Math.max(...waterfall.map(w => w.start + w.duration));

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {speedMetrics.map(m => (
          <Card key={m.label} className="p-5 bg-card border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{m.label}</span>
              <div className="flex items-center gap-2">
                <StatusDot status={m.status} />
                <InfoTip text={m.hint} />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold tabular-nums">{m.value}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Asset Waterfall</h3>
          <div className="flex gap-3 text-xs text-muted-foreground">
            {Object.entries(typeColor).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-sm", c)} />
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {waterfall.map((w, i) => (
            <div key={i} className="grid grid-cols-[160px_1fr_60px] items-center gap-3 text-sm">
              <span className="truncate text-muted-foreground font-mono text-xs">{w.name}</span>
              <div className="relative h-5 rounded bg-muted/40">
                <div
                  className={cn("absolute top-0 h-full rounded transition-all", typeColor[w.type])}
                  style={{
                    left: `${(w.start / maxEnd) * 100}%`,
                    width: `${(w.duration / maxEnd) * 100}%`,
                  }}
                />
              </div>
              <span className="tabular-nums text-xs text-muted-foreground text-right">{w.duration}ms</span>
            </div>
          ))}
        </div>
      </Card>

      <EducationCallout title="What this means for your users">
        Your largest content paints at <strong>3.2 seconds</strong>. Industry data says you lose roughly
        <strong> 53% of mobile visitors</strong> before they see anything meaningful. The biggest culprits
        here are the 1.4MB hero image (uncompressed) and a 920ms vendor bundle that blocks rendering.
        Lazy-load images below the fold and split that bundle — you can shave 1.8 seconds off LCP without touching the server.
      </EducationCallout>
    </div>
  );
}
