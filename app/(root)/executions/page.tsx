import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/app/modules/auth/actions";
import { getExecutions } from "@/app/modules/workflows/actions";
import { TopNav } from "@/app/modules/workflows/components/top-nav";
import { DashboardRail } from "@/app/modules/workflows/components/dashboard-rail";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

export const metadata: Metadata = {
  title: "Executions",
};

// Reads the session via headers(); never prerender this route.
export const instant = false;

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  SUCCESS: { label: "Success", className: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-400" },
  ERROR: { label: "Error", className: "border-destructive/30 bg-destructive/[0.08] text-destructive" },
  RUNNING: { label: "Running", className: "border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-400" },
  WAITING: { label: "Waiting", className: "border-sky-500/25 bg-sky-500/[0.08] text-sky-700 dark:text-sky-400" },
};

export default async function ExecutionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const executions = await getExecutions(30);

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Workflows", href: "/" }, { label: "Executions" }]} />
      <div className="flex min-h-0 flex-1">
        <DashboardRail />
        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Executions</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Recent runs across your workspace. Open a run to inspect each step.
          </p>

          {executions.length === 0 ? (
            <div className="mt-12 rounded-xl border border-border/70 bg-card p-10 text-center">
              <p className="text-sm font-medium text-foreground">No executions yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Trigger a workflow manually or via webhook to see runs here.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl border border-border/70 bg-card shadow-xs">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border/70 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Workflow</th>
                    <th className="px-4 py-3 font-semibold">Trigger</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Started</th>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((execution) => {
                    const status = STATUS_STYLE[execution.status] ?? STATUS_STYLE.WAITING;
                    const duration = execution.finishedAt
                      ? `${((execution.finishedAt.getTime() - execution.startedAt.getTime()) / 1000).toFixed(1)}s`
                      : "—";
                    return (
                      <tr key={execution.id} className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/executions/${execution.id}`}
                            className="rounded-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {execution.workflow.name}
                          </Link>
                          {execution.retryOfId && (
                            <Link href={`/executions/${execution.retryOfId}`} className="ml-2 inline-flex align-middle text-[10px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
                              retry
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{execution.trigger}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("h-5 border px-1.5 text-[10px] font-semibold uppercase tracking-wide", status.className)}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground" title={format(execution.startedAt, "PPpp")}>
                          {formatDistanceToNow(execution.startedAt, { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{duration}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </main>
      </div>
    </>
  );
}
