"use client";

import * as React from "react";
import {
  MousePointer2,
  Webhook,
  Send,
  GitBranch,
  PenLine,
  Split,
  GitCommitHorizontal,
  Globe,
  Sparkles,
  Mail,
  CircleDot,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "manual-trigger": MousePointer2,
  "webhook-trigger": Webhook,
  "telegram-trigger": Send,
  "github-trigger": GitBranch,
  "set-field": PenLine,
  if: Split,
  switch: GitCommitHorizontal,
  "http-request": Globe,
  ai: Sparkles,
  "telegram-send": Mail,
  "github-create-issue": CircleDot,
  "notion-create-page": PenLine,
  "google-calendar-event": CalendarDays,
};

export function NodeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = ICONS[type] ?? CircleDot;
  return <Icon className={cn("size-4", className)} aria-hidden="true" />;
}
