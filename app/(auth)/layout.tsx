import * as React from "react";
import { Workflow, Webhook, Sparkles } from "lucide-react";
import ModeToggle from "@/components/ui/mode-toggle";
import { BrandWordmark } from "@/components/brand-mark";
import { RailEntrance } from "./rail-entrance";

const capabilities = [
  {
    icon: Workflow,
    title: "Visual canvas",
    description: "Chain triggers, conditions and actions on one canvas — no servers to write.",
  },
  {
    icon: Sparkles,
    title: "AI-native steps",
    description: "Drop LLM steps into any workflow to draft, decide and transform data.",
  },
  {
    icon: Webhook,
    title: "Event triggers",
    description: "Fire workflows from webhooks, schedules and connected apps.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative grid min-h-dvh overflow-x-clip overflow-y-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground md:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
      {/* Aurora — blurred coral blobs rising from the bottom, behind everything */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="aurora-blob aurora-blob--a" />
        <div className="aurora-blob aurora-blob--b" />
        <div className="aurora-blob aurora-blob--c" />
      </div>

      {/* Brand rail — keeps a near-solid dark field in both themes so copy stays legible */}
      <aside className="relative z-10 hidden flex-col justify-between overflow-hidden bg-[#0C0E14] px-8 py-8 text-[#F4F4F5] md:flex lg:px-10 lg:py-9 xl:px-14 xl:py-11">
        {/* Quiet engineering-graph texture, kept far below visual noise threshold */}
        <div
          aria-hidden="true"
          className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1.1px)] [background-size:22px_22px]"
        />
                <RailEntrance>
          <div className="relative" data-rail-rise>
            <BrandWordmark size="md" className="text-[#F4F4F5] hover:opacity-90" />
          </div>

          <div className="relative max-w-md space-y-9">
            <h1
              data-rail-rise
              className="font-heading text-4xl font-semibold leading-[1.02] tracking-[-0.025em] text-balance text-[#FAFAFA] lg:text-[2.75rem] xl:text-5xl"
            >
              Your backend, on a canvas<span className="text-[#FF4E6B]">.</span>
            </h1>
            <p data-rail-rise className="max-w-sm text-[15px] leading-7 text-white/60">
              CoralFrame is a nocode visual builder for backend workflows and AI
              automations. Wire triggers to outcomes and ship without servers.
            </p>

            <ul className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {capabilities.map(({ icon: Icon, title, description }) => (
                <li key={title} data-rail-rise className="flex items-start gap-4 py-4">
                  <span className="chip-glass mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.09] text-[#FF8CA6]">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="space-y-0.5">
                    <span className="block text-[13px] font-semibold leading-5 text-white/90">
                      {title}
                    </span>
                    <span className="block text-[13px] leading-5 text-white/60">
                      {description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p data-rail-rise className="relative text-[11px] leading-4 text-white/30">
            © 2026 CoralFrame
          </p>
        </RailEntrance>
      </aside>

      {/* Form column — transparent so the aurora lives behind the card */}
      <div className="relative z-10 flex min-w-0 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between px-5 sm:px-8">
          <div className="md:hidden">
            <BrandWordmark size="sm" />
          </div>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </header>

        <main className="flex min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-8">
          <div className="m-auto w-full max-w-md py-4">{children}</div>
        </main>

        <footer className="pb-5 text-center text-[11px] text-muted-foreground/70 md:hidden">
          © 2026 CoralFrame
        </footer>
      </div>
    </div>
  );
}
