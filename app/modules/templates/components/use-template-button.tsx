"use client";

import { useTransition } from "react";
import { createWorkflowFromTemplate } from "@/app/modules/templates/actions";

export function UseTemplateButton({ templateId, label }: { templateId: string; label: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => createWorkflowFromTemplate(templateId))}
      className="flex h-8 w-full items-center justify-center rounded-md border border-border/70 bg-background px-3 text-[12px] font-semibold text-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-primary/[0.06] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Creating…" : label}
    </button>
  );
}
