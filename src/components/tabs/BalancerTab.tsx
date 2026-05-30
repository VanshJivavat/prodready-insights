import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EducationCallout } from "@/components/EducationCallout";
import { Server, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function BalancerTab() {
  const [spike, setSpike] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button onClick={() => setSpike(s => !s)} variant={spike ? "destructive" : "default"}>
          <Zap className="h-4 w-4 mr-2" />
          {spike ? "Stop traffic spike" : "Simulate traffic spike"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Without */}
        <Card className={cn(
          "p-6 bg-card border-border transition-colors relative overflow-hidden",
          spike && "border-destructive/60"
        )}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Without load balancer</h3>
            <Badge variant={spike ? "destructive" : "outline"}>
              {spike ? "OVERLOADED" : "Single node"}
            </Badge>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            {/* Traffic arrows */}
            <div className="absolute left-0 top-0 bottom-0 w-1/2 flex flex-col justify-around">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={cn(
                  "h-0.5 w-full origin-left",
                  spike ? "bg-destructive animate-pulse" : "bg-primary/60",
                )} style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
            <div className={cn(
              "relative z-10 flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-all",
              spike ? "border-destructive bg-destructive/10" : "border-border bg-muted/30"
            )}>
              <Server className={cn("h-10 w-10", spike ? "text-destructive" : "text-foreground")} />
              <span className="text-xs font-mono">origin-1</span>
              {spike && <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {spike ? "Response times spiking, requests dropping" : "Healthy — but fragile"}
          </p>
        </Card>

        {/* With */}
        <Card className="p-6 bg-card border-success/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">With load balancer</h3>
            <Badge className="bg-success/15 text-success border-success/30" variant="outline">3 nodes healthy</Badge>
          </div>
          <div className="h-56 relative flex items-center justify-between">
            <div className="flex flex-col justify-around h-full py-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-0.5 w-16 bg-primary/60" />
              ))}
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-primary/50 bg-primary/10 px-3 py-4">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-[10px] font-mono">LB</span>
            </div>
            <div className="flex flex-col gap-3">
              {["api-1", "api-2", "api-3"].map(n => (
                <div key={n} className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/5 px-3 py-2">
                  <Server className="h-5 w-5 text-success" />
                  <span className="text-xs font-mono">{n}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Traffic distributed evenly — spike absorbed
          </p>
        </Card>
      </div>

      <EducationCallout title="This is a single point of failure">
        Right now, every request hits one machine. If that machine restarts, runs out of memory, or gets a sudden traffic spike,
        <strong> your entire site goes down for everyone</strong>. Adding a load balancer in front of two more instances costs
        roughly $20–40/month on most clouds and turns "down for an hour" into "one user got a retry." This is the single highest-leverage
        production change you can make.
      </EducationCallout>
    </div>
  );
}
