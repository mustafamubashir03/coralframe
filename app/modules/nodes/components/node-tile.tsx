"use client";

import { SiTelegram, SiGithub, SiNotion, SiGooglecalendar } from "react-icons/si";
import { getNode, type NodeBrand } from "@modules/nodes/lib";
import { NodeIcon } from "./node-icon";
import { cn } from "@/lib/utils";

/* Official brand glyphs via react-icons/si (Simple Icons) — no hand-drawn marks. */
type BrandGlyph = typeof SiTelegram;
const BRAND_GLYPH: Record<NodeBrand, BrandGlyph> = {
    telegram: SiTelegram,
    github: SiGithub,
    notion: SiNotion,
    "google-calendar": SiGooglecalendar,
};

/** Solid tile + correct-contrast glyph, following each brand's own dark/light usage. */
const BRAND_TILE: Record<NodeBrand, string> = {
    telegram: "bg-[#229ED9] text-white ring-1 ring-inset ring-white/20",
    github: "bg-[#24292F] text-[#F0F3F6] ring-1 ring-inset ring-white/15",
    notion: "bg-[#FFFFFF] text-[#111111] ring-1 ring-inset ring-black/10",
    "google-calendar": "bg-[#FFFFFF] text-[#4285F4] ring-1 ring-inset ring-black/10",
};

const SIZES = {
    xs: { tile: "size-6 rounded-md", glyph: "size-3", icon: "size-3" },
    sm: { tile: "size-8 rounded-lg", glyph: "size-4", icon: "size-4" },
    md: { tile: "size-9 rounded-[10px]", glyph: "size-[18px]", icon: "size-[18px]" },
    lg: { tile: "size-10 rounded-xl", glyph: "size-5", icon: "size-5" },
} as const;

export function NodeTile({
    type,
    size = "md",
    className,
}: {
    type: string;
    size?: keyof typeof SIZES;
    className?: string;
}) {
    const definition = getNode(type);
    const brand = definition?.brand;
    const accent = definition?.accent ?? "#64748B";
    const s = SIZES[size];

    if (brand) {
        const Glyph = BRAND_GLYPH[brand];
        return (
            <span
                aria-hidden="true"
                className={cn(
                    "flex shrink-0 items-center justify-center shadow-sm",
                    s.tile,
                    BRAND_TILE[brand],
                    className
                )}
            >
                <Glyph className={s.glyph} />
            </span>
        );
    }

    return (
        <span
            aria-hidden="true"
            className={cn(
                "flex shrink-0 items-center justify-center",
                s.tile,
                className
            )}
            style={{
                backgroundColor: `${accent}1F`,
                color: accent,
                boxShadow: `inset 0 0 0 1px ${accent}40`,
            }}
        >
            <NodeIcon type={type} className={s.icon} />
        </span>
    );
}
