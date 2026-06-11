import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EducationCallout } from "@/components/EducationCallout";
import { Check, X, Loader2 } from "lucide-react";
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
    <div>
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-1">Security Headers & Posture</h3>
        <p className="text-sm text-muted-foreground mb-5">
          {failing} of {checks.length} checks failing
        </p>
        <ul className="divide-y divide-border">
          {checks.map(c => (
            <li key={c.name} className="py-4 flex items-start gap-4">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                c.pass ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              }`}>
                {c.pass ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium font-mono text-sm">{c.name}</span>
                  <Badge variant={c.pass ? "default" : "destructive"} className="text-[10px]">
                    {c.pass ? "PASS" : "FAIL"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{c.risk}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <EducationCallout title="What an attacker sees right now">
        These results come from a live fetch of <strong>{url}</strong>. Missing CSP and HSTS mean an attacker on
        the same coffee-shop WiFi can downgrade a visitor to HTTP, inject JavaScript into the page, and lift
        their session cookie. Fixing the failing findings usually takes an afternoon and stops most opportunistic attacks.
      </EducationCallout>
    </div>
  );
}
