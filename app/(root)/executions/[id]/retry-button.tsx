"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { retryExecution } from "@/app/modules/workflows/actions";

export function RetryExecutionButton({ executionId }: { executionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRetry = () => {
    setError(null);
    startTransition(async () => {
      try {
        await retryExecution(executionId);
        // retryExecution redirects on success — no further action needed.
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't retry this execution.");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleRetry} disabled={isPending} className="h-8 gap-1.5 text-[12px] font-semibold">
        {isPending ? <Spinner className="size-3.5" /> : <RotateCw className="size-3.5" aria-hidden="true" />}
        Retry run
      </Button>
      {error && <p role="alert" className="max-w-[280px] text-right text-[11px] leading-4 text-destructive">{error}</p>}
    </div>
  );
}
