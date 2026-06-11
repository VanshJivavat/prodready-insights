import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { EducationCallout } from "@/components/EducationCallout";
import { Server, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function BalancerTab() {
  const [users, setUsers] = useState(500);

  // Particle count + animation speed scale with user load
  const overloaded = users > 1000;
  const singleCount = Math.min(24, Math.max(4, Math.round(users / 200)));
  const distributedCount = Math.min(36, Math.max(6, Math.round(users / 150)));
  // When overloaded, single-node OUTPUT slows down (queueing)
  const singleOutSpeed = overloaded ? 4.5 + (users - 1000) / 800 : 1.6;
  const singleInSpeed = Math.max(0.6, 2.4 - users / 6000);
  const lbSpeed = Math.max(0.5, 2.0 - users / 8000);

  const singleParticles = useMemo(
    () => Array.from({ length: singleCount }, (_, i) => ({ id: i, delay: (i / singleCount) * singleInSpeed })),
    [singleCount, singleInSpeed],
  );
  const distParticles = useMemo(
    () => Array.from({ length: distributedCount }, (_, i) => ({ id: i, delay: (i / distributedCount) * lbSpeed, lane: i % 3 })),
    [distributedCount, lbSpeed],
  );

  return (
    <div>
      <Card className="p-5 mb-4 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">Simulated concurrent users</label>
          <span className="text-sm tabular-nums font-mono">{users.toLocaleString()}</span>
        </div>
        <Slider min={50} max={10000} step={50} value={[users]} onValueChange={v => setUsers(v[0])} />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>50</span><span>1,000 saturation knee</span><span>10,000</span>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Without */}
        <Card className={cn(
          "p-6 bg-card border-border transition-colors relative overflow-hidden",
          overloaded && "border-destructive/60"
        )}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Without load balancer</h3>
            <Badge variant={overloaded ? "destructive" : "outline"}>
              {overloaded ? "OVERLOADED" : "Single node"}
            </Badge>
          </div>
          <div className="h-56 relative">
            {/* Inbound particles left → server */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" preserveAspectRatio="none">
              <line x1="0" y1="110" x2="240" y2="110" stroke={overloaded ? "oklch(0.62 0.22 25 / 0.3)" : "oklch(0.55 0.16 160 / 0.3)"} strokeWidth="1" strokeDasharray="3 3" />
              {singleParticles.map(p => (
                <circle key={`in-${p.id}`} r="3" fill={overloaded ? "oklch(0.62 0.22 25)" : "oklch(0.72 0.18 160)"}>
                  <animate attributeName="cx" from="0" to="240" dur={`${singleInSpeed}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
                  <animate attributeName="cy" from="110" to="110" dur={`${singleInSpeed}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
                </circle>
              ))}
              {/* Outbound particles from server */}
              <line x1="280" y1="110" x2="400" y2="110" stroke="oklch(0.55 0.16 160 / 0.25)" strokeWidth="1" strokeDasharray="3 3" />
              {singleParticles.slice(0, Math.max(2, Math.floor(singleCount / (overloaded ? 3 : 1)))).map(p => (
                <circle key={`out-${p.id}`} r="3" fill={overloaded ? "oklch(0.78 0.16 75)" : "oklch(0.72 0.18 160)"}>
                  <animate attributeName="cx" from="280" to="400" dur={`${singleOutSpeed}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </svg>
            {/* Server node */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all",
                overloaded
                  ? "border-destructive bg-destructive/10 shadow-[0_0_40px_-5px_oklch(0.62_0.22_25/0.6)] animate-pulse"
                  : "border-border bg-muted/40"
              )}>
                <Server className={cn("h-9 w-9", overloaded ? "text-destructive" : "text-foreground")} />
                <span className="text-xs font-mono">origin-1</span>
                {overloaded && <AlertTriangle className="absolute -top-2 -right-2 h-5 w-5 text-destructive animate-pulse bg-background rounded-full" />}
              </div>
            </div>
          </div>
          <p className={cn("text-xs text-center mt-3", overloaded ? "text-destructive" : "text-muted-foreground")}>
            {overloaded ? "Response times spiking — requests queuing behind a single node" : "Healthy — but fragile, one machine is the entire site"}
          </p>
        </Card>

        {/* With */}
        <Card className="p-6 bg-card border-success/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">With load balancer</h3>
            <Badge className="bg-success/15 text-success border-success/30" variant="outline">3 nodes healthy</Badge>
          </div>
          <div className="h-56 relative">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" preserveAspectRatio="none">
              {/* Incoming line to LB */}
              <line x1="0" y1="110" x2="160" y2="110" stroke="oklch(0.55 0.16 160 / 0.3)" strokeWidth="1" strokeDasharray="3 3" />
              {/* Fan-out to 3 nodes */}
              {[40, 110, 180].map((y, i) => (
                <line key={i} x1="200" y1="110" x2="340" y2={y} stroke="oklch(0.55 0.16 160 / 0.3)" strokeWidth="1" strokeDasharray="3 3" />
              ))}
              {/* Incoming particles */}
              {distParticles.map(p => (
                <circle key={`lin-${p.id}`} r="3" fill="oklch(0.72 0.18 160)">
                  <animate attributeName="cx" from="0" to="160" dur={`${lbSpeed}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
                  <animate attributeName="cy" values="110;110" dur={`${lbSpeed}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
                </circle>
              ))}
              {/* Distributed particles to api-1/2/3 */}
              {distParticles.map(p => {
                const ty = p.lane === 0 ? 40 : p.lane === 1 ? 110 : 180;
                return (
                  <circle key={`dist-${p.id}`} r="3" fill="oklch(0.72 0.18 160)">
                    <animate attributeName="cx" from="200" to="340" dur={`${lbSpeed}s`} begin={`${p.delay + lbSpeed}s`} repeatCount="indefinite" />
                    <animate attributeName="cy" from="110" to={`${ty}`} dur={`${lbSpeed}s`} begin={`${p.delay + lbSpeed}s`} repeatCount="indefinite" />
                  </circle>
                );
              })}
            </svg>
            {/* LB node */}
            <div className="absolute left-[40%] top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="flex flex-col items-center gap-1 rounded-lg border border-primary/50 bg-primary/10 px-3 py-3">
                <Zap className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-[10px] font-mono">LB</span>
              </div>
            </div>
            {/* API nodes */}
            <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-between py-2 z-10">
              {["api-1", "api-2", "api-3"].map(n => (
                <div key={n} className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-2.5 py-1.5">
                  <Server className="h-4 w-4 text-success" />
                  <span className="text-[11px] font-mono">{n}</span>
                  <CheckCircle2 className="h-3 w-3 text-success" />
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-center mt-3 text-muted-foreground">
            Traffic split evenly — all three nodes stay green even at {users.toLocaleString()} users
          </p>
        </Card>
      </div>

      <EducationCallout title="This is a single point of failure">
        Right now, every request hits one machine. If that machine restarts, runs out of memory, or gets a
        sudden traffic spike, <strong>your entire site goes down for everyone</strong>. Adding a load balancer
        in front of two more instances costs roughly $20–40/month on most clouds and turns "down for an hour"
        into "one user got a retry." This is the single highest-leverage production change you can make.
      </EducationCallout>
    </div>
  );
}
