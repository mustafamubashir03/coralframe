"use client";

import * as React from "react";
import { Check, Search, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { getOpenRouterCatalogue } from "@/app/modules/openrouter/actions";
import type { OpenRouterModel } from "@modules/openrouter/lib/catalogue";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type CatalogueModel = OpenRouterModel;

const FILTERS = ["all", "free", "paid"] as const;
type Filter = (typeof FILTERS)[number];

function formatPrice(value: string): string {
    const n = Number(value);
    if (!Number.isFinite(n) || n === 0) return "free";
    const perMillion = n * 1_000_000;
    if (perMillion >= 1) return `$${perMillion.toFixed(2)} / 1M`;
    return `$${perMillion.toFixed(4)} / 1M`;
}

function providerFromId(id: string): string {
    const slash = id.indexOf("/");
    return slash > 0 ? id.slice(0, slash) : id;
}

function formatContext(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M ctx`;
    if (value >= 1_000) return `${Math.round(value / 1000)}k ctx`;
    if (value > 0) return `${value} ctx`;
    return "—";
}

/**
 * Searchable OpenRouter model picker — dynamically fetched, server-cached.
 * Free and paid models are both first-class; selection persists via config.
 */
export function OpenRouterModelSelect({
    value,
    onChange,
}: {
    value: string;
    onChange: (next: string) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const [models, setModels] = React.useState<CatalogueModel[] | null>(null);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [stale, setStale] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [filter, setFilter] = React.useState<Filter>("all");

    const load = React.useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const result = await getOpenRouterCatalogue();
            if (!result.ok) {
                setLoadError(result.error);
                setModels(null);
            } else {
                setModels(result.models);
                setStale(result.stale);
            }
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : "Couldn't reach the catalogue.");
            setModels(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleOpenChange = React.useCallback((nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen && models === null && !isLoading && !loadError) {
            void load();
        }
    }, [models, isLoading, loadError, load]);

    const selected = models?.find((m) => m.id === value);

    const visible = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        return (models ?? [])
            .filter((model) => {
                if (filter === "free" && !model.isFree) return false;
                if (filter === "paid" && model.isFree) return false;
                if (!q) return true;
                return [model.id, model.name, providerFromId(model.id), model.description]
                    .join(" ")
                    .toLowerCase()
                    .includes(q);
            })
            .slice(0, 200);
    }, [models, query, filter]);

    const freeCount = (models ?? []).filter((m) => m.isFree).length;

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger
                className={cn(
                    "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors duration-150",
                    "hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                )}
                aria-label="Select OpenRouter model"
            >
                <span className="min-w-0 truncate text-left">
                    {selected ? (
                        <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium text-foreground">{selected.name}</span>
                            {selected.isFree && (
                                <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                                    Free
                                </span>
                            )}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">{value || "Choose a model…"}</span>
                    )}
                </span>
                <svg className="size-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </PopoverTrigger>

            <PopoverContent align="start" sideOffset={6} className="w-[420px] max-w-[90vw] overflow-hidden rounded-xl border border-border/80 bg-popover p-0 shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <p className="text-[12px] font-semibold text-foreground">OpenRouter models</p>
                        {stale && (
                            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400" title="Showing cached catalogue — latest refresh failed">
                                Stale
                            </span>
                        )}
                    </div>
                    <button type="button" onClick={() => void load()} disabled={isLoading} aria-label="Refresh catalogue" className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                        <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} aria-hidden="true" />
                    </button>
                </div>

                {/* Search + filter */}
                <div className="space-y-2 border-b border-border/60 p-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models or provider…" aria-label="Search OpenRouter models" className="h-8 w-full rounded-md border border-transparent bg-muted/60 pl-8 pr-2 text-[12px] outline-none transition-colors focus:border-border focus:bg-background" />
                    </div>
                    <div className="flex items-center gap-1" role="tablist" aria-label="Pricing filter">
                        {FILTERS.map((f) => (
                            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={cn(
                                "h-7 rounded-full border px-2.5 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                filter === f ? "border-primary/40 bg-primary/[0.12] text-primary" : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                            )}>
                                {f === "all" ? "All" : f === "free" ? `Free (${freeCount})` : "Paid"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto p-1.5">
                    {isLoading && !models && (
                        <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading catalogue…</div>
                    )}
                    {loadError && (
                        <div role="alert" className="mx-1 rounded-lg border border-destructive/30 bg-destructive/[0.08] px-3 py-2.5 text-[11px] leading-5 text-destructive">
                            <div className="flex items-start gap-1.5"><AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{loadError}</span></div>
                            <button type="button" onClick={() => void load()} className="mt-1.5 font-semibold underline underline-offset-2">Retry</button>
                        </div>
                    )}
                    {!isLoading && !loadError && visible.length === 0 && (
                        <p className="py-6 text-center text-[11px] text-muted-foreground">No models match “{query.trim()}”.</p>
                    )}
                    {visible.map((model) => {
                        const active = model.id === value;
                        return (
                            <button key={model.id} type="button" role="option" aria-selected={active} onClick={() => { onChange(model.id); setOpen(false); }}
                                className={cn(
                                    "flex w-full items-start gap-2 rounded-lg border border-transparent px-2 py-2 text-left outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:border-border focus-visible:bg-muted/60",
                                    active && "border-primary/25 bg-primary/[0.06]"
                                )}>
                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                                    {active && <Check className="size-4 text-primary" strokeWidth={2.5} aria-hidden="true" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="truncate text-[12px] font-medium text-foreground">{model.name}</span>
                                        {model.isFree && <span className="shrink-0 rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Free</span>}
                                    </span>
                                    <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{model.id}</span>
                                    <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
                                        {providerFromId(model.id)} · {formatContext(model.contextLength)} · {model.isFree ? "no cost" : `${formatPrice(model.promptPrice)} in / ${formatPrice(model.completionPrice)} out`}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
