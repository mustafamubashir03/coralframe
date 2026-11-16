import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/modules/auth/actions";
import { getWorkflows, getWorkflowStats } from "@/app/modules/workflows/actions";
import { NewWorkflowButton } from "@/app/modules/workflows/components/new-workflow-button";
import { WorkflowList } from "@/app/modules/workflows/components/workflow-list";
import { StatValue } from "@/app/modules/workflows/components/stat-value";
import { TopNav } from "@/app/modules/workflows/components/top-nav";
import { DashboardRail } from "@/app/modules/workflows/components/dashboard-rail";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const [workflows, stats] = await Promise.all([
    getWorkflows(),
    getWorkflowStats(),
  ]);

  const firstName = user.name?.trim().split(/\s+/)[0] ?? undefined;

  const statCells = [
    { label: "Workflows", value: stats.total, hint: "total" },
    { label: "Active", value: stats.active, hint: "running right now" },
    { label: "Runs · 7d", value: stats.runs7d, hint: "executions" },
    {
      label: "Failed · 7d",
      value: stats.failed7d,
      hint: "executions",
      destructive: stats.failed7d > 0,
    },
  ];
  const hasWorkflows = workflows.length > 0;

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Workflows" }]} />
      <div className="flex min-h-0 flex-1">
        <DashboardRail />
        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Page head */}
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-semibold leading-8 tracking-[-0.015em] text-foreground">
                Workflows
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {firstName
                  ? `Your automations, ${firstName} — build, activate and monitor them here.`
                  : "Build, activate and monitor your automations here."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {hasWorkflows && <NewWorkflowButton />}
            </div>
          </section>

          {/* Stats strip — live numbers from your workspace */}
          <section
            aria-label="Workspace stats"
            className="mt-6 grid grid-cols-2 divide-x divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card sm:grid-cols-4 sm:divide-y-0"
          >
            {statCells.map(({ label, value, hint, destructive }, index) => (
              <div key={label} className="stat-cell flex flex-col gap-0.5 px-4 py-3.5 sm:px-5">
                <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                <p
                  className={cn(
                    "stat-value font-heading text-2xl font-semibold leading-7 tracking-tight tabular-nums",
                    destructive ? "text-destructive" : "text-foreground"
                  )}
                >
                  <StatValue value={value} index={index} />
                </p>
                <p className="text-[10px] text-muted-foreground/80">{hint}</p>
              </div>
            ))}
          </section>

          {!hasWorkflows && (
            <section aria-label="Getting started" className="mt-8 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/[0.06] to-transparent p-5">
              <p className="text-[13px] font-semibold text-foreground">Ship your first workflow in minutes</p>
              <ol className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
                <li className="flex min-w-0 items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/40 text-[10px] font-bold text-primary">1</span>
                  <span className="text-[12px] leading-5 text-muted-foreground"><Link href="/credentials" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80">Connect an integration</Link> — add one token or API key</span>
                </li>
                <li className="flex min-w-0 items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/40 text-[10px] font-bold text-primary">2</span>
                  <span className="text-[12px] leading-5 text-muted-foreground"><Link href="/templates" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80">Pick a template</Link> — pre-wired graphs with your credentials detected</span>
                </li>
                <li className="flex min-w-0 items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/40 text-[10px] font-bold text-primary">3</span>
                  <span className="text-[12px] leading-5 text-muted-foreground">Press <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono text-foreground">Run now</kbd> on the canvas and watch steps light up</span>
                </li>
              </ol>
            </section>
          )}

          {/* Workflows */}
          <section aria-label="Your workflows" className="mt-6">
            <WorkflowList workflows={workflows} />
          </section>
          </div>
        </main>
      </div>
    </>
  );
}
