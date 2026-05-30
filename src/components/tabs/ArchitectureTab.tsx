import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EducationCallout } from "@/components/EducationCallout";
import { archNodes, archEdges } from "@/lib/mock-data";

export function ArchitectureTab() {
  const byId = Object.fromEntries(archNodes.map(n => [n.id, n]));

  return (
    <div>
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-1">Inferred production stack</h3>
        <p className="text-sm text-muted-foreground mb-4">Detected = blue/green · Missing = amber/red</p>

        <div className="overflow-x-auto">
          <svg viewBox="0 0 820 320" className="w-full h-[320px] min-w-[760px]">
            {/* edges */}
            {archEdges.map(([from, to], i) => {
              const a = byId[from], b = byId[to];
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
            {/* nodes */}
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
        Your traffic flows browser → origin server directly. There's no CDN absorbing static asset requests,
        and no load balancer in front of your app. The red nodes are the gaps that hurt you at scale: they're
        cheap to add now, and excruciating to add after you have real traffic depending on uptime.
      </EducationCallout>
    </div>
  );
}
