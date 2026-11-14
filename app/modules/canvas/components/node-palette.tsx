"use client";

import * as React from "react";
import { Search, ListTree, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NodeTile } from "@modules/nodes/components/node-tile";
import { NODE_TYPES, CATEGORY_ACCENT, type NodeCategory } from "@modules/nodes/lib";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: NodeCategory[] = ["trigger", "transform", "ai", "action"];
const CATEGORY_LABEL: Record<NodeCategory, string> = {
    trigger: "Triggers",
    transform: "Transform",
    ai: "AI",
    action: "Actions",
};

function startDrag(event: React.DragEvent, type: string) {
    event.dataTransfer.setData("application/x-coralframe-node", type);
    event.dataTransfer.effectAllowed = "move";
}

export function NodePalette({
    onAdd,
    collapsed,
    onToggleCollapsed,
    className,
}: {
    onAdd: (type: string) => void;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    className?: string;
}) {
    const [query, setQuery] = React.useState("");
    const normalized = query.trim().toLowerCase();

    const grouped = React.useMemo(() => {
        const filtered = normalized
            ? NODE_TYPES.filter((node) =>
                  [node.label, node.description ?? "", node.type, node.category]
                      .join(" ")
                      .toLowerCase()
                      .includes(normalized)
              )
            : NODE_TYPES;

        const map = new Map<NodeCategory, typeof filtered>();
        for (const node of filtered) {
            const list = map.get(node.category) ?? [];
            list.push(node);
            map.set(node.category, list);
        }
        return CATEGORY_ORDER.flatMap((category) => {
            const nodes = map.get(category);
            return nodes && nodes.length > 0 ? [{ category, nodes }] : [];
        });
    }, [normalized]);

    return (
        <aside
            aria-label="Step library"
            className={cn(
                "flex h-full shrink-0 flex-col border-r border-border/70 bg-background",
                "transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                collapsed ? "w-16" : "w-72",
                className
            )}
        >
            {collapsed ? (
                <>
                    <div className="flex h-12 shrink-0 items-center justify-center border-b border-border/70">
                        <button
                            type="button"
                            onClick={onToggleCollapsed}
                            aria-label="Expand steps panel"
                            title="Expand steps panel"
                            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <PanelLeftOpen className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
                        <ul className="flex flex-col items-center gap-1">
                            {CATEGORY_ORDER.flatMap((category) => {
                                const nodes = NODE_TYPES.filter((node) => node.category === category);
                                return nodes.map((node, index) => (
                                    <React.Fragment key={node.type}>
                                        {index === 0 && category !== "trigger" && (
                                            <li aria-hidden="true" className="my-1 h-px w-6 bg-border/70" />
                                        )}
                                        <li>
                                            <button
                                                type="button"
                                                draggable
                                                onDragStart={(event) => startDrag(event, node.type)}
                                                onClick={() => onAdd(node.type)}
                                                aria-label={`Add ${node.label}`}
                                                title={node.label}
                                                className="flex size-11 items-center justify-center rounded-xl outline-none transition-[background-color,transform] duration-150 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94] motion-reduce:transition-none"
                                            >
                                                <NodeTile type={node.type} size="sm" />
                                            </button>
                                        </li>
                                    </React.Fragment>
                                ));
                            })}
                        </ul>
                    </div>
                </>
            ) : (
                <>
                    {/* Header */}
                    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4">
                        <div className="flex min-w-0 items-center gap-2">
                            <ListTree className="size-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
                            <h2 className="text-[13px] font-semibold text-foreground">Steps</h2>
                            <span
                                aria-label={`${NODE_TYPES.length} steps available`}
                                className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground"
                            >
                                {NODE_TYPES.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onToggleCollapsed}
                            aria-label="Collapse steps panel"
                            title="Collapse steps panel"
                            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <PanelLeftClose className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="shrink-0 border-b border-border/60 p-2.5">
                        <div className="relative">
                            <Search
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search steps…"
                                aria-label="Search steps"
                                className="h-9 w-full rounded-lg border border-transparent bg-muted/60 pl-9 pr-3 text-[13px] text-foreground shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] outline-none transition-colors duration-150 placeholder:text-muted-foreground hover:bg-muted/80 focus:border-border focus:bg-background dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.35)]"
                            />
                        </div>
                    </div>

                    {/* Library */}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                        {grouped.length === 0 ? (
                            <p className="px-3 py-8 text-center text-[12px] leading-5 text-muted-foreground">
                                No steps match “{query.trim()}”.
                            </p>
                        ) : (
                            grouped.map(({ category, nodes }) => (
                                <section key={category} aria-labelledby={`palette-${category}`} className="mb-1.5 last:mb-0">
                                    <h3
                                        id={`palette-${category}`}
                                        className="flex items-center gap-2 px-2.5 pb-1.5 pt-3.5 text-[11px] font-semibold text-muted-foreground first:pt-1"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="size-1.5 rounded-full"
                                            style={{ backgroundColor: CATEGORY_ACCENT[category] }}
                                        />
                                        {CATEGORY_LABEL[category]}
                                    </h3>
                                    <ul className="space-y-0.5">
                                        {nodes.map((node) => (
                                            <li key={node.type}>
                                                <button
                                                    type="button"
                                                    draggable
                                                    onDragStart={(event) => startDrag(event, node.type)}
                                                    onClick={() => onAdd(node.type)}
                                                    aria-label={`Add ${node.label}`}
                                                    title={node.description}
                                                    className="group flex w-full cursor-grab items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-[background-color,transform] duration-150 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing active:scale-[0.98] motion-reduce:transition-none"
                                                >
                                                    <NodeTile type={node.type} size="md" />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[13px] font-medium leading-[18px] text-foreground">
                                                            {node.label}
                                                        </span>
                                                        {node.description && (
                                                            <span className="block truncate text-[11px] leading-4 text-muted-foreground">
                                                                {node.description}
                                                            </span>
                                                        )}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))
                        )}
                    </div>

                    {/* Footer hint */}
                    <div className="shrink-0 border-t border-border/60 px-4 py-2.5">
                        <p className="text-[10px] leading-4 text-muted-foreground/80">
                            Click to add, or drag onto the canvas
                        </p>
                    </div>
                </>
            )}
        </aside>
    );
}
