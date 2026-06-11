import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EducationCallout } from "@/components/EducationCallout";
import { Loader2 } from "lucide-react";
import { runSpeedAudit } from "@/lib/api/audit.functions";
import { archEdges } from "@/lib/mock-data";

export function ArchitectureTab({ url }: { url: string }) {
  const fn = useServerFn(runSpeedAudit);
  const { data, isLoading, error } = useQuery({
    queryKey: ["speed", url],
    queryFn: () => fn({ data: { url } }),
  });

  if (isLoading) {
    return (
      <Card className="p-10 bg-card border-border flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Inferring infrastructure…
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card className="p-6 bg-card border-destructive/40 text-sm text-destructive">
        Could not reach the target URL for architecture analysis.
      </Card>
    );
  }

  const archNodes = data.archNodes;
  const byId = Object.fromEntries(archNodes.map(n => [n.id, n]));

  return (
    <div>
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-1">Inferred production stack</h3>
        <p className="text-sm text-muted-foreground mb-4">Detected = blue/green · Missing = amber/red</p>

        <div className="overflow-x-auto">
          <svg viewBox="0 0 820 320" className="w-full h-[320px] min-w-[760px]">
            {archEdges.map(([from, to], i) => {
              const a = byId[from], b = byId[to];
              if (!a || !b) return null;
              const detected = a.detected && b.detected;
              return (
                <line
                  key={i}
                  x1={a.x + 60} y1={a.y}
                  x2={b.x - 60} y2={b.y}
                  stroke={detected ? "oklch(0.72 0.18 160)" : "oklch(0.62 0.22 25 / 0.5)"}
                  strokeWidth={2}
                  strokeDasharray={detected ? "0" : "6 4"}
                />
              );
            })}
            {archNodes.map(n => (
              <g key={n.id}>
                <rect
                  x={n.x - 60} y={n.y - 32}
                  width={120} height={64} rx={12}
                  fill={n.detected ? "oklch(0.72 0.18 160 / 0.12)" : "oklch(0.62 0.22 25 / 0.1)"}
                  stroke={n.detected ? "oklch(0.72 0.18 160)" : "oklch(0.62 0.22 25)"}
                  strokeWidth={1.5}
                />
                <text x={n.x} y={n.y - 4} textAnchor="middle" className="fill-foreground" fontSize={13} fontWeight={600}>
                  {n.label}
                </text>
                <text x={n.x} y={n.y + 14} textAnchor="middle"
                  fill={n.detected ? "oklch(0.72 0.18 160)" : "oklch(0.62 0.22 25)"}
                  fontSize={10} fontWeight={500}>
                  {n.detected ? "DETECTED" : "MISSING"}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </Card>

      <Card className="mt-4 p-6 bg-card border-border">
        <h3 className="text-sm font-semibold mb-3">Per-node findings</h3>
        <ul className="space-y-2">
          {archNodes.map(n => (
            <li key={n.id} className="flex items-center justify-between text-sm border-b border-border/60 pb-2 last:border-0">
              <span className="font-medium">{n.label}</span>
              <span className="text-muted-foreground text-xs flex-1 mx-4 truncate">{n.note}</span>
              <Badge variant={n.detected ? "default" : "destructive"} className="text-[10px]">
                {n.detected ? "OK" : "NOT DETECTED"}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <EducationCallout title="This is your inferred production stack">
        Inferred from live response headers on <strong>{url}</strong>. Red nodes are the gaps that hurt you at
        scale — they're cheap to add now and painful to add after real traffic depends on uptime.
      </EducationCallout>
    </div>
  );
}
