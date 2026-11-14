"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { renameWorkflow } from "@/app/modules/workflows/actions";
import { cn } from "@/lib/utils";

export function RenameWorkflow({
  id,
  name,
  className,
  textClassName,
  href,
}: {
  id: string;
  name: string;
  className?: string;
  textClassName?: string;
  href?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(name);
  const [renameError, setRenameError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [optimisticName, setOptimisticName] = React.useOptimistic(
    name,
    (_state: string, next: string) => next
  );
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keep local input state in sync with the server-prop name without an effect.
  const [prevName, setPrevName] = React.useState(name);
  if (prevName !== name) {
    setPrevName(name);
    setValue(name);
    setRenameError(null);
  }

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const next = value.trim();
    setEditing(false);
    if (!next || next === name) {
      setValue(name);
      return;
    }
    setRenameError(null);
    startTransition(async () => {
      setOptimisticName(next);
      const res = await renameWorkflow(id, next);
      if (!res.ok) setRenameError(res.error ?? "Couldn't rename workflow.");
    });
  };

  const cancel = () => {
    setValue(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={cn("flex min-w-0 flex-col gap-1", className)}>
        <div className="flex min-w-0 items-center gap-1.5">
          <Input
            ref={inputRef}
            value={value}
            disabled={isPending}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancel();
              }
            }}
            onBlur={commit}
            aria-label="Workflow name"
            className="h-8 min-w-0 flex-1 text-[13px]"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Save name"
            disabled={isPending}
            onMouseDown={(event) => event.preventDefault()}
            onClick={commit}
            className="shrink-0 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            <Check className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel rename"
            disabled={isPending}
            onMouseDown={(event) => event.preventDefault()}
            onClick={cancel}
            className="shrink-0 text-muted-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        {renameError && (
          <p role="alert" className="text-[11px] leading-4 text-destructive">
            {renameError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("group/rename flex min-w-0 flex-col gap-0.5", className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn("truncate text-[13px] font-medium text-foreground", textClassName)}
          title={optimisticName}
        >
          {href ? (
            <Link href={href} className="rounded-sm transition-colors duration-150 ease-emphasized hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {optimisticName}
            </Link>
          ) : (
            optimisticName
          )}
        </span>
        <button
          type="button"
          aria-label="Rename workflow"
          onClick={() => {
            setValue(optimisticName);
            setEditing(true);
          }}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 opacity-100 outline-none transition-colors duration-150 ease-emphasized hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover/rename:opacity-100"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {renameError && (
        <p role="alert" className="text-[11px] leading-4 text-destructive">
          {renameError}
        </p>
      )}
    </div>
  );
}
