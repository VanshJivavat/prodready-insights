import { cn } from "@/lib/utils";
import type { Status } from "@/lib/mock-data";

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  const color =
    status === "good" ? "bg-success shadow-success/50" :
    status === "warn" ? "bg-warning shadow-warning/50" :
    "bg-destructive shadow-destructive/50";
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_8px]", color, className)} />;
}
