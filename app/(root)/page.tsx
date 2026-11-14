import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/modules/auth/actions";
import { getWorkflows, getWorkflowStats } from "@/app/modules/workflows/actions";
import { NewWorkflowButton } from "@/app/modules/workflows/components/new-workflow-button";
import { WorkflowList } from "@/app/modules/workflows/components/workflow-list";
import { StatValue } from "@/app/modules/workflows/components/stat-value";
import { TopNav } from "@/app/modules/workflows/components/top-nav";
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
      <main id="main-content" className="min-h-0 flex-1 overflow-y-auto">
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
            {hasWorkflows && <NewWorkflowButton />}
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

          {/* Workflows */}
          <section aria-label="Your workflows" className="mt-6">
            <WorkflowList workflows={workflows} />
          </section>
        </div>
      </main>
    </>
  );
}
