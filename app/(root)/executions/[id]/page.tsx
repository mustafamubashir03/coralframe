import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/app/modules/auth/actions";
import { getExecution } from "@/app/modules/workflows/actions";
import { TopNav } from "@/app/modules/workflows/components/top-nav";
import { DashboardRail } from "@/app/modules/workflows/components/dashboard-rail";
import { RetryExecutionButton } from "./retry-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Execution detail",
};

// Reads the session via headers(); never prerender this route.
export const instant = false;

const STATUS: Record<string, { label: string; dot: string; className: string }> = {
  SUCCESS: { label: "Success", dot: "bg-emerald-500", className: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-400" },
  ERROR: { label: "Failed", dot: "bg-destructive", className: "border-destructive/30 bg-destructive/[0.08] text-destructive" },
  RUNNING: { label: "Running", dot: "bg-amber-500 animate-pulse", className: "border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-400" },
  WAITING: { label: "Waiting", dot: "bg-sky-500", className: "border-sky-500/25 bg-sky-500/[0.08] text-sky-700 dark:text-sky-400" },
};

const STEP_ICON: Record<string, ReactNode> = {
  SUCCESS: <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">✓</span>,
  ERROR: <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-[10px] text-destructive">✕</span>,
  RUNNING: <span aria-hidden="true" className="size-5 animate-spin rounded-full border border-amber-500/50 border-t-transparent" />,
};

function stepDuration(startedAt: Date, finishedAt: Date | null) {
  if (!finishedAt) return "—";
  const delta = finishedAt.getTime() - startedAt.getTime();
  return delta < 1000 ? `${delta}ms` : `${(delta / 1000).toFixed(2)}s`;
}

function PreBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="group/json rounded-lg border border-border/60 bg-background">
      <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {title}
        <span aria-hidden="true" className="text-[10px] text-muted-foreground/60 transition-transform duration-150 group-open/json:rotate-90">▸</span>
      </summary>
      <pre className="max-h-48 overflow-auto border-t border-border/60 px-3 py-2 font-mono text-[11px] leading-4 text-muted-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const execution = await getExecution(id);
  if (!execution) notFound();

  const status = STATUS[execution.status] ?? STATUS.WAITING;
  const duration = execution.finishedAt
    ? `${((execution.finishedAt.getTime() - execution.startedAt.getTime()) / 1000).toFixed(2)}s`
    : "in flight";

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Workflows", href: "/" }, { label: execution.workflow.name, href: `/workflows/${execution.workflow.id}` }, { label: "Execution" }]} />
      <div className="flex min-h-0 flex-1">
        <DashboardRail />
        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Link href="/executions" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            All executions
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">{execution.workflow.name}</h1>
                {execution.retryOfId && (
                  <Link href={`/executions/${execution.retryOfId}`} className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground">
                    retry of original
                  </Link>
                )}
                {execution.retries.length > 0 && (
                  <span className="rounded-md border border-primary/25 bg-primary/[0.08] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    {execution.retries.length} {execution.retries.length === 1 ? "retry" : "retries"}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                <Badge variant="outline" className={cn("h-6 border px-2 text-[10px] font-semibold uppercase tracking-wide", status.className)}>
                  <span aria-hidden="true" className={cn("mr-1.5 size-1.5 rounded-full", status.dot)} />
                  {status.label}
                </Badge>
                <span>{execution.trigger}</span>
                <span className="tabular-nums">started {format(execution.startedAt, "PPpp")}</span>
                <span className="tabular-nums">duration {duration}</span>
              </div>
            </div>
            <RetryExecutionButton executionId={execution.id} />
          </div>

          {execution.retries.length > 0 && (
            <nav aria-label="Retry attempts" className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-medium">Attempts:</span>
              {execution.retries.map((retry, index) => (
                <Link
                  key={retry.id}
                  href={`/executions/${retry.id}`}
                  className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 font-medium transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  #{index + 1} · {retry.status}
                </Link>
              ))}
            </nav>
          )}
          {execution.retryOfId && (
            <nav aria-label="Original execution" className="mt-4 text-[11px] text-muted-foreground">
              <Link href={`/executions/${execution.retryOfId}`} className="underline underline-offset-2 hover:text-foreground">
                View the original run that this retries →
              </Link>
            </nav>
          )}

          <ol className="mt-8 space-y-2" aria-label="Step timeline">
            {execution.steps.map((step, index) => {
              const stepStatus = STATUS[step.status] ?? STATUS.WAITING;
              const stepIcon = STEP_ICON[step.status] ?? STEP_ICON.RUNNING;
              return (
                <li
                  key={step.id}
                  className="rounded-xl border border-border/70 bg-card p-4 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden="true" className="w-5 text-center text-[11px] font-semibold tabular-nums text-muted-foreground/60">{index + 1}</span>
                      <span aria-hidden="true">{stepIcon}</span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-foreground">{step.nodeName}</p>
                        <p className="text-[11px] leading-4 text-muted-foreground">{step.nodeType} · {stepDuration(step.startedAt, step.finishedAt)}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("h-5 border px-1.5 text-[10px] font-semibold uppercase tracking-wide", stepStatus.className)}>
                      {stepStatus.label}
                    </Badge>
                  </div>
                  {step.error && step.error !== "" && (
                    <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/[0.08] px-3 py-2 text-[12px] leading-4 text-destructive">
                      {step.error}
                    </p>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <PreBlock title="Input" value={step.input ?? {}} />
                    <PreBlock title="Output" value={step.output ?? {}} />
                  </div>
                </li>
              );
            })}
          </ol>
          </div>
        </main>
      </div>
    </>
  );
}
