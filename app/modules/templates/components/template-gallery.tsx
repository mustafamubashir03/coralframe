"use client";

import * as React from "react";
import { Search, LayoutGrid, Sparkles, GitBranch, Webhook, Rocket, MousePointer2, Globe, MessageSquareCode, Split, PenLine, CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";
import { SiGithub, SiTelegram, SiNotion, SiGooglecalendar } from "react-icons/si";
import Link from "next/link";
import { TEMPLATES, requiredProviders, providerLabel, type Template, type TemplateCategory } from "@modules/templates/lib/templates";
import { UseTemplateButton } from "./use-template-button";
import { NodeTile } from "@modules/nodes/components/node-tile";
import { cn } from "@/lib/utils";

function TechIcon({ type, className }: { type: string; className?: string }) {
  const props = { className: cn("size-4", className), "aria-hidden": true as const };
  switch (type) {
    case "manual-trigger": return <MousePointer2 {...props} />;
    case "webhook-trigger": return <Webhook {...props} />;
    case "telegram-trigger":
    case "telegram-send": return <SiTelegram className={cn("size-4", className)} aria-hidden="true" />;
    case "github-trigger":
    case "github-create-issue": return <SiGithub className={cn("size-4", className)} aria-hidden="true" />;
    case "notion-create-page": return <SiNotion className={cn("size-4", className)} aria-hidden="true" />;
    case "google-calendar-event": return <SiGooglecalendar className={cn("size-4", className)} aria-hidden="true" />;
    case "http-request": return <Globe {...props} />;
    case "ai": return <MessageSquareCode {...props} />;
    case "if": return <Split {...props} />;
    case "switch": return <Split {...props} />;
    case "set-field": return <PenLine {...props} />;
    default: return <CalendarDays {...props} />;
  }
}

function TechStack({ template }: { template: Template }) {
  const stack = Array.from(new Set(template.nodes.map((n) => n.data.nodeType)));
  return (
    <div className="mt-3 flex items-center gap-1.5" aria-label={`Integrations: ${stack.join(", ")}`}>
      {stack.slice(0, 5).map((type) => (
        <span
          key={type}
          title={type}
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/50 text-muted-foreground transition-colors duration-150 group-hover:border-primary/25 group-hover:text-foreground"
        >
          <TechIcon type={type} className="size-4" />
        </span>
      ))}
      {stack.length > 5 && (
        <span className="text-[10px] font-medium text-muted-foreground">+{stack.length - 5}</span>
      )}
    </div>
  );
}

const CATEGORY_META: Record<TemplateCategory, { label: string; accent: string; icon: typeof Sparkles }> = {
  ai: { label: "AI", accent: "#E0234E", icon: Sparkles },
  github: { label: "GitHub", accent: "#24292F", icon: GitBranch },
  webhook: { label: "Routing", accent: "#0891B2", icon: Webhook },
  productivity: { label: "Productivity", accent: "#059669", icon: Rocket },
};

function RequirementRow({ template, ownedProviders }: { template: Template; ownedProviders: string[] }) {
  const needed = requiredProviders(template);
  if (needed.length === 0) return null;
  const missing = needed.filter((p) => !ownedProviders.includes(p));
  const ready = missing.length === 0;
  return (
    <Link
      href="/credentials"
      className={cn(
        "mt-2 flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
        ready
          ? "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-700 hover:border-emerald-500/50 dark:text-emerald-400"
          : "border-amber-500/40 bg-amber-500/[0.08] text-amber-800 hover:border-amber-500/60 dark:text-amber-300"
      )}
      title={ready ? "All credentials in place" : `Missing: ${missing.map(providerLabel).join(", ")}`}
    >
      {ready ? (
        <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1 truncate">
        {ready ? "Credentials ready" : `Needs: ${missing.map(providerLabel).join(", ")}`}
      </span>
    </Link>
  );
}
const TABS: { id: "all" | TemplateCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ai", label: "AI" },
  { id: "github", label: "GitHub" },
  { id: "webhook", label: "Routing" },
  { id: "productivity", label: "Productivity" },
];

function TemplateCard({ template, ownedProviders }: { template: Template; ownedProviders: string[] }) {
  const meta = CATEGORY_META[template.category];
  return (
    <div
      className="group flex flex-col rounded-xl border border-border/70 bg-card p-4 shadow-xs transition-all duration-200 ease-emphasized hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start gap-3">
        <NodeTile type={template.iconType} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-5 text-foreground">{template.name}</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground" style={{ color: meta.accent }}>
            {meta.label}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-5 text-muted-foreground">{template.summary}</p>

      <TechStack template={template} />
      <RequirementRow template={template} ownedProviders={ownedProviders} />

      <div className="mt-auto pt-4">
        <p className="mb-2 text-[10px] tabular-nums text-muted-foreground/80">
          {template.nodes.length} steps · {template.edges.length} connection{template.edges.length === 1 ? "" : "s"}
        </p>
        <UseTemplateButton templateId={template.id} label="Use template" />
      </div>
    </div>
  );
}

export function TemplateGallery({ ownedProviders }: { ownedProviders: string[] }) {
  const [tab, setTab] = React.useState<"all" | TemplateCategory>("all");
  const [query, setQuery] = React.useState("");
  const normalized = query.trim().toLowerCase();

  const visible = React.useMemo(() => {
    return TEMPLATES.filter((template) => {
      if (tab !== "all" && template.category !== tab) return false;
      if (!normalized) return true;
      const haystack = [template.name, template.summary, template.category, ...template.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [tab, normalized]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates…"
            aria-label="Search templates"
            className="h-9 w-full rounded-lg border border-transparent bg-muted/60 pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-border focus:bg-background"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Template categories">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={cn(
                  "h-8 rounded-full border px-3 text-[12px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary/30 bg-primary/[0.12] text-primary"
                    : "border-border/70 bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Count */}
      <p className="mt-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        <LayoutGrid className="size-3.5" aria-hidden="true" />
        {visible.length} template{visible.length === 1 ? "" : "s"}
      </p>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border/70 bg-muted/30 px-6 py-12 text-center">
          <p className="text-[13px] font-medium text-foreground">Nothing matches “{query.trim()}”</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Try a broader search term or clear the filters.</p>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((template) => (
            <TemplateCard key={template.id} template={template} ownedProviders={ownedProviders} />
          ))}
        </div>
      )}

      {/* Footnote */}
      <p className="mt-8 text-center text-[11px] leading-5 text-muted-foreground">
        Templates are starting points — every token, ID, and branch is editable in the canvas before your first run.
      </p>
    </div>
  );
}
