"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { Plus, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { createWorkflow } from "@/app/modules/workflows/actions";
import { cn } from "@/lib/utils";

export function NewWorkflowButton({
  label = "New workflow",
  fullWidth = false,
}: {
  label?: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !isPending;

  const submit = () => {
    if (!canSubmit) {
      setError("Enter a name for this workflow.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await createWorkflow(trimmed);
      setOpen(false);
      setName("");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="default"
            className={cn("group h-9 gap-1.5 text-[13px] font-semibold shadow-sm", fullWidth && "w-full justify-center")}
          >
            <Plus className="size-4 transition-transform duration-200 ease-out group-hover:rotate-45 motion-reduce:transition-none" strokeWidth={2.25} aria-hidden="true" />
            <span>{label}</span>
          </Button>
        }
      />
      <DialogContent showCloseButton={!isPending} className="gap-5">
        <DialogHeader>
          <DialogTitle className="text-lg">Create workflow</DialogTitle>
          <DialogDescription>
            Name your workflow. You can rename it at any time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workflow-name" className="text-[13px] font-medium text-foreground">
              Name
            </Label>
            <Input
              id="workflow-name"
              autoFocus
              placeholder="Handle inbound webhooks"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              disabled={isPending}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "workflow-name-error" : undefined}
              className="h-10 bg-background text-sm"
            />
            {error && (
              <p id="workflow-name-error" role="alert" className="text-[12px] font-medium text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" size="default">Cancel</Button>} />
            <Button type="submit" size="default" disabled={!canSubmit} className="h-10">
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Workflow className="size-4" aria-hidden="true" />
                  Create workflow
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
