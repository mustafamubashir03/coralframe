"use client";

import Link from "next/link";
import type * as React from "react";
import { ChevronRight } from "lucide-react";
import ModeToggle from "@/components/ui/mode-toggle";
import { UserButton } from "@/app/modules/auth/components/user-button";
import { BrandWordmark } from "@/components/brand-mark";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function TopNav({
    breadcrumbs = [],
    right,
    className,
}: {
    breadcrumbs?: { label: React.ReactNode; href?: string }[];
    right?: React.ReactNode;
    className?: string;
}) {
    return (
        <header
            className={cn(
                "sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 backdrop-blur-sm px-3 sm:px-4",
                className
            )}
        >
            <div className="flex min-w-0 items-center gap-1.5">
                <BrandWordmark size="sm" />
                {breadcrumbs.length > 0 && (
                    <>
                        <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
                        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
                            {breadcrumbs.map((crumb, index) => {
                                const isLast = index === breadcrumbs.length - 1;
                                return (
                                    <div key={index} className="flex min-w-0 items-center gap-1.5">
                                        {isLast || !crumb.href ? (
                                            <div
                                                aria-current="page"
                                                className={cn(
                                                    "flex min-w-0 items-center truncate text-[13px] text-foreground",
                                                    typeof crumb.label === "string"
                                                        ? isLast
                                                            ? "font-semibold"
                                                            : "font-medium text-muted-foreground"
                                                        : undefined
                                                )}
                                            >
                                                {crumb.label}
                                            </div>
                                        ) : (
                                            <Link
                                                href={crumb.href}
                                                className="truncate font-medium text-muted-foreground transition-colors hover:text-foreground"
                                            >
                                                {crumb.label}
                                            </Link>
                                        )}
                                        {!isLast && (
                                            <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
                                        )}
                                    </div>
                                );
                            })}
                        </nav>
                    </>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
                {right}
                <ModeToggle className="size-8 rounded-md border-transparent bg-transparent shadow-none backdrop-blur-none hover:border-border/60 hover:bg-muted" />
                <Separator orientation="vertical" className="mx-0.5 h-5" />
                <UserButton />
            </div>
        </header>
    );
}
