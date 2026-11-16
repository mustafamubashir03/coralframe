import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/modules/auth/actions";
import { TopNav } from "@/app/modules/workflows/components/top-nav";
import { DashboardRail } from "@/app/modules/workflows/components/dashboard-rail";
import { CredentialsClient } from "@/app/modules/credentials/components/credentials-manager";

// Reads the session via headers(); never prerender this route.
export const instant = false;

export const metadata = {
  title: "Credentials",
};

export default async function CredentialsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <>
      <TopNav breadcrumbs={[{ label: "Workflows", href: "/" }, { label: "Credentials" }]} />
      <div className="flex min-h-0 flex-1">
        <DashboardRail />
        <main id="main-content" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <CredentialsClient />
          </div>
        </main>
      </div>
    </>
  );
}
