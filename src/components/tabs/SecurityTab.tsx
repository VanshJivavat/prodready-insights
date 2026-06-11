import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { EducationCallout } from "@/components/EducationCallout";
import { Check, X, Loader2, ShieldAlert, AlertTriangle, Wrench } from "lucide-react";
import { runSecurityAudit } from "@/lib/api/audit.functions";

export function SecurityTab({ url }: { url: string }) {
  const fn = useServerFn(runSecurityAudit);
  const { data, isLoading, error } = useQuery({
    queryKey: ["security", url],
    queryFn: () => fn({ data: { url } }),
  });

  if (isLoading) {
    return (
      <Card className="p-10 bg-card border-border flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning security headers…
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card className="p-6 bg-card border-destructive/40 text-sm text-destructive">
        Could not reach the target URL for security analysis.
      </Card>
    );
  }

  const checks = data.checks;
  const failing = checks.filter(c => !c.pass).length;

  return (
    <div className="print-section">
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-1">Security Headers & Posture</h3>
        <p className="text-sm text-muted-foreground mb-5">
          {failing} of {checks.length} checks failing
        </p>

        <Accordion type="multiple" className="divide-y divide-border border-y border-border">
          {checks.map(c => (
            <AccordionItem key={c.name} value={c.name} className="border-0">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    c.pass ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}>
                    {c.pass ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <span className="font-medium font-mono text-sm">{c.name}</span>
                  <Badge variant={c.pass ? "default" : "destructive"} className="text-[10px] ml-auto mr-2">
                    {c.pass ? "PASS" : "FAIL"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-11 pr-2 pb-5 space-y-4">
                <Section
                  icon={<ShieldAlert className="h-3.5 w-3.5" />}
                  title="What this means (Simple Terms)"
                  tone="muted"
                >
                  {c.simple || "—"}
                </Section>
                <Section
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  title="The Risk"
                  tone="danger"
                >
                  {c.risk || "—"}
                </Section>
                <Section
                  icon={<Wrench className="h-3.5 w-3.5" />}
                  title="How to Fix"
                  tone="success"
                >
                  {c.fix ? (
                    <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed">{c.fix}</pre>
                  ) : "—"}
                </Section>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <EducationCallout title="What an attacker sees right now">
        Live header scan of <strong>{url}</strong>. Each failing header expands above with a plain-English
        explanation, the concrete risk, and the exact server snippet to fix it.
      </EducationCallout>
    </div>
  );
}

function Section({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: "muted" | "danger" | "success"; children: React.ReactNode }) {
  const toneClass =
    tone === "danger" ? "border-destructive/30 bg-destructive/5"
    : tone === "success" ? "border-success/30 bg-success/5"
    : "border-border bg-muted/30";
  const iconClass =
    tone === "danger" ? "text-destructive"
    : tone === "success" ? "text-success"
    : "text-muted-foreground";
  return (
    <div className={`rounded-lg border ${toneClass} p-3`}>
      <div className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${iconClass} mb-1.5`}>
        {icon}{title}
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
}
