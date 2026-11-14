"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground selection:bg-primary selection:text-primary-foreground">
      <div className="relative">
        <BrandMark size="lg" className="rounded-xl opacity-90" />
        <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-destructive text-white">
          <TriangleAlert className="size-3" aria-hidden="true" />
        </span>
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          An unexpected error interrupted the page. Try again — if it keeps
          happening, reload the window.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={reset} size="default" className="h-10 gap-1.5 px-5 text-[13px]">
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
        <Button variant="ghost" size="default" className="h-10 px-4 text-[13px]" onClick={() => router.push("/")}>
          Go home
        </Button>
      </div>
    </div>
  );
}
