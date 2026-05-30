import { Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

export function EducationCallout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/15 p-2">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-primary">{title}</h4>
          <p className="mt-1 text-sm text-foreground/85 leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}
