import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EducationCallout } from "@/components/EducationCallout";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Point { t: number; rt: number; users: number; }

function simulatedRt(users: number): number {
  // Stable until ~500 users, then climbs steeply
  const base = 80 + users * 0.05;
  const stress = users > 500 ? Math.pow(users - 500, 1.35) * 0.02 : 0;
  const jitter = (Math.random() - 0.5) * 40;
  return Math.max(40, base + stress + jitter);
}

export function StressTab() {
  const [targetUsers, setTargetUsers] = useState(1000);
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<Point[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    setData([]);
    setRunning(true);
    let t = 0;
    tickRef.current = setInterval(() => {
      t += 1;
      const ramp = Math.min(1, t / 20);
      const users = Math.round(targetUsers * ramp);
      setData(prev => {
        const next = [...prev, { t, rt: simulatedRt(users), users }];
        return next.slice(-40);
      });
      if (t >= 40) {
        setRunning(false);
        if (tickRef.current) clearInterval(tickRef.current);
      }
    }, 250);
  }

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  const last = data[data.length - 1];
  const status: { label: string; tone: "good" | "warn" | "bad" } = !last
    ? { label: "Idle", tone: "good" }
    : last.rt < 300 ? { label: "Server stable", tone: "good" }
    : last.rt < 800 ? { label: "Degrading", tone: "warn" }
    : { label: "Failing", tone: "bad" };

  return (
    <div>
      <Card className="p-6 bg-card border-border">
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Live Stress Test</h3>
              <Badge className={
                status.tone === "good" ? "bg-success/15 text-success border-success/30" :
                status.tone === "warn" ? "bg-warning/15 text-warning border-warning/30" :
                "bg-destructive/15 text-destructive border-destructive/30"
              } variant="outline">
                {status.label}
              </Badge>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 250)" />
                  <XAxis dataKey="t" stroke="oklch(0.68 0.02 250)" tick={{ fontSize: 11 }} label={{ value: "time (s)", position: "insideBottom", offset: -2, fill: "oklch(0.68 0.02 250)", fontSize: 11 }} />
                  <YAxis stroke="oklch(0.68 0.02 250)" tick={{ fontSize: 11 }} label={{ value: "ms", angle: -90, position: "insideLeft", fill: "oklch(0.68 0.02 250)", fontSize: 11 }} />
                  <RTooltip contentStyle={{ background: "oklch(0.21 0.018 250)", border: "1px solid oklch(0.3 0.02 250)", borderRadius: 8 }} />
                  <ReferenceLine y={300} stroke="oklch(0.78 0.16 75)" strokeDasharray="4 4" />
                  <ReferenceLine y={800} stroke="oklch(0.62 0.22 25)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="rt" stroke="oklch(0.72 0.18 160)" strokeWidth={2} dot={false} isAnimationActive={false} name="response (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Concurrent users</label>
                <span className="text-sm tabular-nums font-mono">{targetUsers.toLocaleString()}</span>
              </div>
              <Slider
                min={10}
                max={10000}
                step={10}
                value={[targetUsers]}
                onValueChange={v => setTargetUsers(v[0])}
                disabled={running}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>10</span><span>10,000</span>
              </div>
            </div>
            <Button onClick={start} disabled={running} className="w-full">
              {running ? "Running…" : "Start test"}
            </Button>
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Peak response</span><span className="font-mono tabular-nums">{data.length ? `${Math.max(...data.map(d => d.rt)).toFixed(0)}ms` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Active users</span><span className="font-mono tabular-nums">{last?.users.toLocaleString() ?? "—"}</span></div>
            </div>
          </div>
        </div>
      </Card>

      <EducationCallout title="At what point does your server start dropping requests?">
        Your origin holds steady until roughly <strong>500 concurrent users</strong>. After that, response times
        climb non-linearly — every extra user makes every other user wait longer, because requests start queuing
        behind slow database calls. By 2,000 users you're in "failing" territory and real users will see timeouts.
        A single launch on Hacker News, a Reddit post, or a 30-second TV spot easily clears that bar.
      </EducationCallout>
    </div>
  );
}
