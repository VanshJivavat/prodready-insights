import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { z } from "zod";

const steps = [
  "Fetching page assets…",
  "Checking security headers…",
  "Simulating traffic load…",
  "Mapping architecture…",
  "Generating your report…",
];

export const Route = createFileRoute("/analyzing")({
  validateSearch: z.object({ url: z.string().default("https://example.com") }),
  component: Analyzing,
});

function Analyzing() {
  const { url } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const total = steps.length;
    const t = setInterval(() => {
      setStep(s => {
        if (s + 1 >= total) {
          clearInterval(t);
          setTimeout(() => navigate({ to: "/dashboard", search: { url } }), 400);
          return s + 1;
        }
        return s + 1;
      });
    }, 700);
    return () => clearInterval(t);
  }, [url, navigate]);

  return (
    <div className="min-h-screen grid place-items-center relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.18_160/0.15),transparent_70%)]" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="flex items-center justify-center gap-2 font-semibold mb-8">
          <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          </div>
          ProdReady
        </div>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-2xl">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Auditing</div>
          <div className="mt-1 font-mono text-sm truncate">{url}</div>

          <ul className="mt-6 space-y-3">
            {steps.map((s, i) => {
              const state = i < step ? "done" : i === step ? "active" : "pending";
              return (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <div className={`h-6 w-6 rounded-full grid place-items-center ${
                    state === "done" ? "bg-success/20 text-success" :
                    state === "active" ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {state === "done" ? <Check className="h-3.5 w-3.5" /> :
                     state === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                     <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </div>
                  <span className={state === "pending" ? "text-muted-foreground" : ""}>{s}</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, (step / steps.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
