import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { TopNav } from "@/app/modules/workflows/components/top-nav";
import { cn } from "@/lib/utils";

export default function WorkflowNotFound() {
  return (
    <>
      <TopNav breadcrumbs={[{ label: "Workflows", href: "/" }, { label: "Not found" }]} />
      <main id="main-content" className="flex min-h-0 flex-1 items-center justify-center px-6">
        <div className="flex flex-col items-center justify-center gap-5 text-center">
          <BrandMark size="lg" className="rounded-xl opacity-90" />
          <div className="space-y-1.5">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Workflow not found
            </h1>
            <p className="max-w-xs text-[13px] leading-5 text-muted-foreground">
              This workflow may have been deleted, or it belongs to a different workspace.
            </p>
          </div>
          <Link href="/" className={cn(buttonVariants({ size: "default" }), "h-9 gap-2 text-[13px]")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to workflows
          </Link>
        </div>
      </main>
    </>
  );
}
