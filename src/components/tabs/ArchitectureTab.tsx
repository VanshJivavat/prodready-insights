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

  const archNodes = data.archNodes as Array<{
    id: string; label: string; detected: boolean; inferred: boolean;
    zone: string; x: number; y: number; note: string;
    cause: string; impact: string; solution: string;
  }>;
  const byId = Object.fromEntries(archNodes.map(n => [n.id, n]));
  const edgeNodes = archNodes.filter(n => n.zone === "edge");
  const backendNodes = archNodes.filter(n => n.zone === "backend");

  const colorFor = (n: { detected: boolean; inferred: boolean }) => {
    if (n.inferred) return { stroke: "oklch(0.72 0.14 250)", fill: "oklch(0.72 0.14 250 / 0.10)", text: "oklch(0.78 0.14 250)" };
    if (n.detected) return { stroke: "oklch(0.72 0.18 160)", fill: "oklch(0.72 0.18 160 / 0.12)", text: "oklch(0.78 0.18 160)" };
    return { stroke: "oklch(0.62 0.22 25)", fill: "oklch(0.62 0.22 25 / 0.10)", text: "oklch(0.72 0.22 25)" };
  };

  const badgeFor = (n: { detected: boolean; inferred: boolean }) => {
    if (n.inferred) return { label: "INFERRED", className: "bg-primary/15 text-primary border-primary/30" };
    if (n.detected) return { label: "DETECTED", className: "bg-success/15 text-success border-success/30" };
    return { label: "NOT DETECTED", className: "bg-destructive/15 text-destructive border-destructive/30" };
  };

  return (
    <div>
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-1">Inferred production stack</h3>
        <p className="text-sm text-muted-foreground mb-4">
          <span className="text-success font-medium">Green = detected from live headers</span> ·{" "}
          <span className="text-primary font-medium">Blue = inferred standard pattern</span> ·{" "}
          <span className="text-destructive font-medium">Red = missing / risky</span>
        </p>

        <div className="overflow-x-auto">
          <svg viewBox="0 0 760 360" className="w-full h-[360px] min-w-[720px]">
            {/* Zone backgrounds */}
            <g>
              <rect x="20" y="40" width="720" height="130" rx="14"
                fill="oklch(0.72 0.18 160 / 0.04)" stroke="oklch(0.72 0.18 160 / 0.25)" strokeDasharray="4 4" />
              <text x="36" y="62" fontSize="11" fontWeight={700} fill="oklch(0.78 0.18 160)" letterSpacing="1">
                VISIBLE AT EDGE · scanned from live headers
              </text>
              <rect x="20" y="190" width="720" height="150" rx="14"
                fill="oklch(0.72 0.14 250 / 0.04)" stroke="oklch(0.72 0.14 250 / 0.25)" strokeDasharray="4 4" />
              <text x="36" y="212" fontSize="11" fontWeight={700} fill="oklch(0.78 0.14 250)" letterSpacing="1">
                INFERRED BACKEND · standard production pattern
              </text>
            </g>

            {/* Edges */}
            {archEdges.map(([from, to], i) => {
              const a = byId[from], b = byId[to];
              if (!a || !b) return null;
              const dashed = !a.detected || !b.detected || a.inferred || b.inferred;
              const stroke = (a.inferred || b.inferred)
                ? "oklch(0.72 0.14 250 / 0.55)"
                : (a.detected && b.detected)
                ? "oklch(0.72 0.18 160)"
                : "oklch(0.62 0.22 25 / 0.55)";
              return (
                <line key={i}
                  x1={a.x + 60} y1={a.y}
                  x2={b.x - 60} y2={b.y}
                  stroke={stroke} strokeWidth={2}
                  strokeDasharray={dashed ? "6 4" : "0"} />
              );
            })}

            {/* Nodes */}
            {archNodes.map(n => {
              const c = colorFor(n);
              const b = badgeFor(n);
              return (
                <g key={n.id}>
                  <rect x={n.x - 60} y={n.y - 28} width={120} height={56} rx={10}
                    fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />
                  <text x={n.x} y={n.y - 4} textAnchor="middle" className="fill-foreground" fontSize={12} fontWeight={600}>
                    {n.label}
                  </text>
                  <text x={n.x} y={n.y + 14} textAnchor="middle" fill={c.text} fontSize={9} fontWeight={600} letterSpacing="0.5">
                    {b.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <NodeColumn title="Visible at edge" subtitle="Confirmed from response headers" nodes={edgeNodes} badgeFor={badgeFor} />
        <NodeColumn title="Inferred backend" subtitle="Cannot be detected from outside — standard pattern" nodes={backendNodes} badgeFor={badgeFor} />
      </div>

      <EducationCallout title="What you are looking at">
        The top zone is real — we scanned <strong>{url}</strong> and saw these layers in the response headers.
        The bottom zone is an industry-standard pattern; we cannot see your database or internal services from
        the outside, so we describe the typical risks every production app of this shape has to deal with.
      </EducationCallout>
    </div>
  );
}

function NodeColumn({
  title, subtitle, nodes, badgeFor,
}: {
  title: string; subtitle: string;
  nodes: Array<{ id: string; label: string; detected: boolean; inferred: boolean; note: string; cause: string; impact: string; solution: string }>;
  badgeFor: (n: { detected: boolean; inferred: boolean }) => { label: string; className: string };
}) {
  return (
    <Card className="p-5 bg-card border-border">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ul className="space-y-4">
        {nodes.map(n => {
          const b = badgeFor(n);
          return (
            <li key={n.id} className="border border-border/60 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{n.label}</span>
                <Badge variant="outline" className={`text-[10px] ${b.className}`}>{b.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{n.note}</p>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-foreground font-semibold">The Cause · </span>
                  <span className="text-muted-foreground">{n.cause}</span>
                </div>
                <div>
                  <span className="text-warning font-semibold">The Impact · </span>
                  <span className="text-muted-foreground">{n.impact}</span>
                </div>
                <div>
                  <span className="text-success font-semibold">The Solution · </span>
                  <span className="text-muted-foreground">{n.solution}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
