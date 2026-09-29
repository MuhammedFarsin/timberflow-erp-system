import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorSteps } from "@/lib/data";


export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-surface flex flex-col items-center justify-center px-6 py-16 text-center">
      <h3 className="text-base font-medium">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  steps,
}: {
  message: string;
  onRetry?: () => void;
  steps?: string[];
}) {
  const list = steps ?? errorSteps(message);
  return (
    <div className="card-surface flex flex-col items-center justify-center px-6 py-14 text-center">
      <h3 className="text-base font-medium text-danger">Couldn't load this data</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {list.length ? (
        <div className="mt-5 w-full max-w-md rounded-xl bg-muted/60 p-4 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What you can try
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {list.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {onRetry ? (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}


type Tone = "success" | "warning" | "danger" | "neutral";

const toneClass: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-muted text-muted-foreground",
};

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        toneClass[tone],
      )}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}

export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (["paid", "received", "available", "active", "completed"].includes(s)) return "success";
  if (["pending", "partial", "partially_paid", "upcoming", "low", "unpaid", "draft"].includes(s))
    return "warning";
  if (["overdue", "cancelled", "out_of_stock", "out of stock"].includes(s)) return "danger";
  return "neutral";
}
