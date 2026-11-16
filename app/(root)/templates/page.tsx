import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/modules/auth/actions";
import { listWorkspaceCredentials } from "@/app/modules/credentials/actions";
import { TopNav } from "@/app/modules/workflows/components/top-nav";
import { DashboardRail } from "@/app/modules/workflows/components/dashboard-rail";
import { TemplateGallery } from "@/app/modules/templates/components/template-gallery";

// Reads the session via headers(); never prerender this route.
export const instant = false;

export const metadata = {
  title: "Templates",
};

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const credentials = await listWorkspaceCredentials();
  const ownedProviders = Array.from(new Set(credentials.map((cred) => cred.provider)));

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Workflows", href: "/" }, { label: "Templates" }]} />
      <div className="flex min-h-0 flex-1">
        <DashboardRail />
        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-semibold leading-8 tracking-[-0.015em] text-foreground">Templates</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Pre-wired workflows for the jobs people build most. Pick one, add your tokens, ship.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <TemplateGallery ownedProviders={ownedProviders} />
          </div>
          </div>
        </main>
      </div>
    </>
  );
}
