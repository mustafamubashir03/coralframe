import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground selection:bg-primary selection:text-primary-foreground">
      <BrandMark size="lg" className="rounded-xl" />
      <div className="space-y-2">
        <p className="font-mono text-xs text-muted-foreground">404</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          This page doesn’t exist
        </h1>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          The link may be broken, or the page may have moved. Head back to your
          workspace or sign in again.
        </p>
      </div>
      <Link href="/" className={cn(buttonVariants({ size: "default" }), "h-10 px-5 text-[13px]")}>
        Back to CoralFrame
      </Link>
    </div>
  );
}
