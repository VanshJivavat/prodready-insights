import { securityChecks } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EducationCallout } from "@/components/EducationCallout";
import { Check, X } from "lucide-react";

export function SecurityTab() {
  const failing = securityChecks.filter(c => !c.pass).length;

  return (
    <div>
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-1">Security Headers & Posture</h3>
        <p className="text-sm text-muted-foreground mb-5">
          {failing} of {securityChecks.length} checks failing
        </p>
        <ul className="divide-y divide-border">
          {securityChecks.map(c => (
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
        Your site is missing CSP and HSTS, and cookies don't have Secure flags. In practice, that means an
        attacker on the same coffee-shop WiFi can downgrade a visitor to HTTP, inject JavaScript into the page,
        and lift their session cookie. None of this requires a sophisticated exploit — these are tools script
        kiddies download for free. Fixing all six findings takes about an afternoon and stops 90% of opportunistic attacks.
      </EducationCallout>
    </div>
  );
}
