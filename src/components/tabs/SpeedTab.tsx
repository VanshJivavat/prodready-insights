import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { InfoTip } from "@/components/InfoTip";
import { EducationCallout } from "@/components/EducationCallout";
import { StatusDot } from "@/components/StatusDot";
import { Loader2 } from "lucide-react";
import { runSpeedAudit } from "@/lib/api/audit.functions";
import { waterfall } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const typeColor: Record<string, string> = {
  doc: "bg-chart-2",
  js: "bg-chart-3",
  css: "bg-chart-1",
  img: "bg-chart-5",
  font: "bg-chart-4",
};

export function SpeedTab({ url }: { url: string }) {
  const fn = useServerFn(runSpeedAudit);
  const { data, isLoading, error } = useQuery({
    queryKey: ["speed", url],
    queryFn: () => fn({ data: { url } }),
  });

  const maxEnd = Math.max(...waterfall.map(w => w.start + w.duration));

  if (isLoading) {
    return (
      <Card className="p-10 bg-card border-border flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Measuring real latency and payload…
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card className="p-6 bg-card border-destructive/40 text-sm text-destructive">
        Could not reach the target URL for speed analysis.
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data.metrics.map(m => (
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
          <h3 className="text-lg font-semibold">Asset Waterfall <span className="text-xs font-normal text-muted-foreground ml-2">(typical pattern)</span></h3>
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
        Your origin responded in <strong>{data.ttfb}ms</strong> with a {(data.bytes / 1024).toFixed(0)}KB HTML payload.
        {data.server && <> Server reports <code className="font-mono text-xs">{data.server}</code>.</>}
        {data.xCache && <> Edge cache status: <code className="font-mono text-xs">{data.xCache}</code>.</>}
        {" "}Lazy-load below-the-fold images and split vendor bundles to bring LCP under the 2.5s threshold Google rewards.
      </EducationCallout>
    </div>
  );
}
