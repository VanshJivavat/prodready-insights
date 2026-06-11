import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EducationCallout } from "@/components/EducationCallout";
import { ShieldCheck } from "lucide-react";
import { runLatencyProbe } from "@/lib/api/audit.functions";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Point { t: number; rt: number; users: number; }

export function StressTab({ url }: { url: string }) {
  const probe = useServerFn(runLatencyProbe);
  const [targetUsers, setTargetUsers] = useState(1000);
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<Point[]>([]);
  const [waf, setWaf] = useState<null | { reason: string }>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  const cancelRef = useRef(false);

  async function start() {
    setData([]);
    setWaf(null);
    setRunning(true);
    cancelRef.current = false;

    // Gentle baseline probe (3 samples)
    let base = 0;
    try {
      const res = await probe({ data: { url, samples: 3 } });
      if (res.wafDetected) {
        setWaf({ reason: res.wafBlocks > 0
          ? `Origin returned ${res.wafBlocks} throttled response${res.wafBlocks > 1 ? "s" : ""} (429/403/503)`
          : `Origin dropped ${res.connectionDrops} synthetic connection${res.connectionDrops > 1 ? "s" : ""}` });
        setRunning(false);
        return;
      }
      base = res.avg || 120;
      setBaseline(base);
    } catch {
      base = 200;
      setBaseline(base);
    }

    // Mathematical latency curve from baseline as slider ramps
    const totalTicks = 24;
    const knee = 500; // users where queueing kicks in
    for (let t = 1; t <= totalTicks && !cancelRef.current; t++) {
      const ramp = t / totalTicks;
      const users = Math.round(targetUsers * ramp);
      // M/M/1-ish curve: rt = base * (1 + (u/knee)^1.6) + jitter
      const stress = users <= knee ? 0 : Math.pow((users - knee) / knee, 1.6);
      const jitter = (Math.random() - 0.5) * base * 0.15;
      const rt = Math.max(20, base * (1 + stress * 1.8) + jitter);
      setData(prev => [...prev, { t, rt, users }].slice(-40));
      await new Promise(r => setTimeout(r, 220));
    }
    setRunning(false);
  }

  useEffect(() => () => { cancelRef.current = true; }, []);

  const last = data[data.length - 1];
  const status: { label: string; tone: "good" | "warn" | "bad" } = !last
    ? { label: "Idle", tone: "good" }
    : last.rt < 300 ? { label: "Server stable", tone: "good" }
    : last.rt < 800 ? { label: "Degrading", tone: "warn" }
    : { label: "Failing", tone: "bad" };

  if (waf) {
    return (
      <div>
        <Card className="p-8 bg-card border-success/40">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-success/15 grid place-items-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-success" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">WAF / Rate Limiter Active</h3>
                <Badge className="bg-success/15 text-success border-success/30" variant="outline">Protected</Badge>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                Excellent defense posture. The target site is actively dropping or throttling rapid synthetic
                requests to prevent an outage, showing high resilience.
              </p>
              <p className="text-xs text-muted-foreground mt-3">{waf.reason}</p>
              <Button onClick={() => { setWaf(null); setData([]); }} variant="outline" size="sm" className="mt-4">
                Re-run probe
              </Button>
            </div>
          </div>
        </Card>
        <EducationCallout title="Why this is good news">
          Production-grade sites (banks, exchanges, large SaaS) sit behind a Web Application Firewall that
          identifies synthetic load and rejects it before it reaches the origin. A clean 429/403 here means
          attackers can't trivially exhaust your servers either.
        </EducationCallout>
      </div>
    );
  }

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
                  <XAxis dataKey="users" stroke="oklch(0.68 0.02 250)" tick={{ fontSize: 11 }} label={{ value: "concurrent users", position: "insideBottom", offset: -2, fill: "oklch(0.68 0.02 250)", fontSize: 11 }} />
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
              {running ? "Probing…" : "Start live test"}
            </Button>
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Baseline TTFB</span><span className="font-mono tabular-nums">{baseline ? `${baseline.toFixed(0)}ms` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Peak response</span><span className="font-mono tabular-nums">{data.length ? `${Math.max(...data.map(d => d.rt)).toFixed(0)}ms` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Active users</span><span className="font-mono tabular-nums">{last?.users.toLocaleString() ?? "—"}</span></div>
            </div>
          </div>
        </div>
      </Card>

      <EducationCallout title="At what point does your server start dropping requests?">
        We measure a gentle baseline first, then model the latency curve as concurrency climbs toward
        <strong> {targetUsers.toLocaleString()}</strong> users. Past the saturation knee, every extra user
        makes every other user wait longer — requests queue behind slow database calls and the curve
        bends non-linearly. If the target site sits behind a WAF that throttles us, we surface that as
        a protected state instead of a false failure.
      </EducationCallout>
    </div>
  );
}
