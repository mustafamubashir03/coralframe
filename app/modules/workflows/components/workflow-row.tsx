"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
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
import { RenameWorkflow } from "./rename-workflow";
import { toggleActive, deleteWorkflow } from "@/app/modules/workflows/actions";
import { cn } from "@/lib/utils";

export type WorkflowRow = {
  id: string;
  name: string;
  active: boolean;
  updatedAt: string | Date;
  executions: { status: string; startedAt: string | Date }[];
};

const STATUS_STYLES: Record<string, { label: string; dot: string; chip: string }> = {
  SUCCESS: {
    label: "Success",
    dot: "bg-emerald-500",
    chip: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-400",
  },
  ERROR: {
    label: "Error",
    dot: "bg-destructive",
    chip: "border-destructive/20 bg-destructive/[0.08] text-destructive",
  },
  RUNNING: {
    label: "Running",
    dot: "bg-amber-500 animate-pulse",
    chip: "border-amber-500/25 bg-amber-500/[0.08] text-amber-700 dark:text-amber-400",
  },
  WAITING: {
    label: "Waiting",
    dot: "bg-sky-500",
    chip: "border-sky-500/20 bg-sky-500/[0.08] text-sky-700 dark:text-sky-400",
  },
};

function lastRun(workflow: WorkflowRow) {
  return workflow.executions?.[0] ?? null;
}

function relativeTime(value: string | Date) {
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function absoluteTime(value: string | Date) {
  return format(new Date(value), "PPpp");
}

export function WorkflowRowItem({ workflow }: { workflow: WorkflowRow }) {
  const [isToggling, startToggle] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isDeleting, startDelete] = React.useTransition();
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isActive, setIsActive] = React.useOptimistic(
    workflow.active,
    (_state, checked: boolean) => checked
  );
  const run = lastRun(workflow);
  const statusStyle = run ? STATUS_STYLES[run.status] : undefined;

  const handleToggle = (checked: boolean) => {
    setActionError(null);
    startToggle(async () => {
      setIsActive(checked);
      const res = await toggleActive(workflow.id, checked);
      if (!res.ok) setActionError(res.error ?? "Couldn't update workflow.");
    });
  };

  const handleDelete = () => {
    startDelete(async () => {
      await deleteWorkflow(workflow.id);
    });
  };

  return (
    <TableRow className="transition-colors duration-150 hover:bg-muted/50 focus-within:bg-primary/[0.04]">
      {/* Name */}
      <TableCell className="max-w-[280px] py-3.5">
        <RenameWorkflow
          id={workflow.id}
          name={workflow.name}
          href={`/workflows/${workflow.id}`}
        />
      </TableCell>

      {/* Last run */}
      <TableCell className="py-3.5">
        {run ? (
          <div className="flex flex-col gap-1">
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                statusStyle?.chip ?? "border-border/60 bg-muted/50 text-muted-foreground"
              )}
            >
              <span className={cn("size-1.5 rounded-full", statusStyle?.dot ?? "bg-muted-foreground/50")} aria-hidden="true" />
              {statusStyle?.label ?? run.status}
            </span>
            <span className="pl-0.5 text-[11px] leading-4 text-muted-foreground" title={absoluteTime(run.startedAt)}>
              {relativeTime(run.startedAt)}
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-muted-foreground">Never run</span>
        )}
      </TableCell>

      {/* Updated */}
      <TableCell className="hidden py-3.5 xl:table-cell">
        <span className="text-[13px] text-muted-foreground" title={absoluteTime(workflow.updatedAt)}>
          {relativeTime(workflow.updatedAt)}
        </span>
      </TableCell>

      {/* Active */}
      <TableCell className="py-3.5">
        <Switch
          checked={isActive}
          disabled={isToggling}
          onCheckedChange={handleToggle}
          aria-label={isActive ? `Deactivate ${workflow.name}` : `Activate ${workflow.name}`}
        />
        {actionError && (
          <p role="alert" className="mt-1 text-[11px] leading-4 text-destructive">
            {actionError}
          </p>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="py-3.5 text-right">
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions for ${workflow.name}`}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
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
      </TableCell>
    </TableRow>
  );
}
