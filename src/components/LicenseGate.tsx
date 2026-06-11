import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Props {
  feature: string;
  children: ReactNode;
}

export function LicenseGate({ feature, children }: Props) {
  const { user, licenseStatus, signIn, upgrade } = useAuth();

  if (user && licenseStatus === "pro") return <>{children}</>;

  return (
    <Card className="p-10 bg-card border-border relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative max-w-lg mx-auto text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/15 grid place-items-center glow-primary">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <Badge variant="outline" className="mt-4 border-primary/40 text-primary">
          <Sparkles className="h-3 w-3 mr-1" /> PRO MODULE
        </Badge>
        <h2 className="mt-4 text-2xl font-bold">{feature} is a Pro feature</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {!user
            ? "Sign in to unlock advanced production tests including live stress testing and load balancer simulations."
            : "Upgrade your license to run advanced production audits against your real infrastructure."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {!user ? (
            <Button onClick={() => signIn()}>
              <KeyRound className="h-4 w-4 mr-2" /> Sign in to continue
            </Button>
          ) : (
            <Button onClick={upgrade}>
              <Sparkles className="h-4 w-4 mr-2" /> Upgrade to Pro
            </Button>
          )}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Free tier includes Page Speed, Security, and Architecture audits.
        </p>
      </div>
    </Card>
  );
}
