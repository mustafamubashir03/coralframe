"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { TopNav } from "./top-nav";
import { RenameWorkflow } from "./rename-workflow";
import { SaveIndicator } from "@modules/canvas/components/save-indicator";
import { SaveStatusProvider } from "@modules/canvas/components/save-status-context";
import { toggleActive, deleteWorkflow } from "@/app/modules/workflows/actions";
import { cn } from "@/lib/utils";

export function WorkflowEditor({
  workflow,
  children,
}: {
  workflow: { id: string; name: string; active: boolean };
  children?: React.ReactNode;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isToggling, startToggle] = React.useTransition();
  const [isDeleting, startDelete] = React.useTransition();
  const [toggleError, setToggleError] = React.useState<string | null>(null);
  const [isActive, setIsActive] = React.useOptimistic(
    workflow.active,
    (_state, checked: boolean) => checked
  );

  const handleToggle = (checked: boolean) => {
    setToggleError(null);
    startToggle(async () => {
      setIsActive(checked);
      const res = await toggleActive(workflow.id, checked);
      if (!res.ok) setToggleError(res.error ?? "Couldn't update workflow.");
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      await deleteWorkflow(workflow.id);
    });
  };

  return (
    <SaveStatusProvider>
      <div className="relative flex h-full min-h-0 flex-col">
        <TopNav
          breadcrumbs={[
            { label: "Workflows", href: "/" },
            { label: <RenameWorkflow id={workflow.id} name={workflow.name} textClassName="text-[13px]" /> },
          ]}
          right={
            <>
              <SaveIndicator />

              <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />

              {/* Activation toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  size="sm"
                  checked={isActive}
                  disabled={isToggling}
                  onCheckedChange={handleToggle}
                  aria-label={isActive ? "Deactivate workflow" : "Activate workflow"}
                />
                <span
                  className={cn(
                    "hidden text-[12px] font-medium sm:inline",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Delete */}
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Workflow actions"
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isDeleting ? <Spinner className="size-4" /> : <Trash2 className="size-4" aria-hidden="true" />}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={4} className="w-44">
                    <DropdownMenuItem
                      variant="destructive"
                      className="cursor-pointer gap-2 text-[13px]"
                      onClick={() => setConfirmOpen(true)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      <span>Delete workflow</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <span className="font-semibold text-foreground">{workflow.name}</span>
                      {" "}and its execution history will be permanently deleted. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive"
                    >
                      {isDeleting ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="size-4" /> Deleting…
                        </span>
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          }
        />

        {toggleError && (
          <p role="alert" className="absolute left-1/2 top-14 z-30 -translate-x-1/2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[11px] leading-4 text-destructive shadow-sm">
            {toggleError}
          </p>
        )}

        {/* Canvas area — React Flow mounts here */}
        <main id="main-content" className="relative min-h-0 flex-1 overflow-hidden bg-background">
          {children ?? (
            <div
              aria-label="Workflow canvas"
              className="absolute inset-0 [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:20px_20px]"
            />
          )}
        </main>
      </div>
    </SaveStatusProvider>
  );
}
