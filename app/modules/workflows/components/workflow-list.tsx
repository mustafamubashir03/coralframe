"use client";

import * as React from "react";
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Search, X, SearchX, Workflow } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { NewWorkflowButton } from "./new-workflow-button";
import { WorkflowRowItem, type WorkflowRow } from "./workflow-row";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

export function WorkflowList({ workflows }: { workflows: WorkflowRow[] }) {
  const [query, setQuery] = React.useState("");
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? workflows.filter((workflow) => workflow.name.toLowerCase().includes(normalized))
    : workflows;

  // Restrained entrance: rows rise once on mount, transform/opacity only.
  useGSAP(
    () => {
      const rows = tbodyRef.current?.querySelectorAll("tr");
      if (!rows || rows.length === 0) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(rows, {
        opacity: 0,
        y: 10,
        duration: 0.32,
        stagger: 0.045,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    },
    { scope: tbodyRef, dependencies: [] }
  );

  const showEmpty = workflows.length === 0;
  const showNoMatches = workflows.length > 0 && filtered.length === 0;

  return (
    <div>
      {/* Toolbar */}
      {!showEmpty && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              role="searchbox"
              aria-label="Search workflows"
              placeholder="Search workflows..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 bg-background pl-9 pr-8 text-[13px]"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <p
            aria-live="polite"
            className={cn(
              "text-xs tabular-nums text-muted-foreground transition-opacity",
              normalized ? "opacity-100" : "opacity-0"
            )}
          >
            {filtered.length} of {workflows.length}
          </p>
        </div>
      )}

      {/* Table */}
      {!showEmpty && !showNoMatches && (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-xs">
          <Table className="min-w-0">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[34%] font-semibold text-foreground">Name</TableHead>
                <TableHead className="font-semibold text-foreground">Last run</TableHead>
                <TableHead className="hidden font-semibold text-foreground xl:table-cell">Updated</TableHead>
                <TableHead className="font-semibold text-foreground">Active</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody ref={tbodyRef}>
              {filtered.map((workflow) => (
                <WorkflowRowItem key={workflow.id} workflow={workflow} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* No matches */}
      {showNoMatches && (
        <Empty className="border border-border/70 bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No workflows match “{query.trim()}”</EmptyTitle>
            <EmptyDescription>
              Try a different name, or clear the search to see all {workflows.length} workflows.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={() => setQuery("")}>
              Clear search
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {/* No workflows yet */}
      {showEmpty && (
        <Empty className="border border-border/70 bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="tile-raised size-16 rounded-2xl [&_svg]:size-8 [&_svg]:text-primary">
              <Workflow strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle>No workflows yet</EmptyTitle>
            <EmptyDescription>
              Wire a trigger to a chain of actions on a visual canvas and let CoralFrame
              run it for you — no servers, no boilerplate.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewWorkflowButton label="Create your first workflow" />
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
