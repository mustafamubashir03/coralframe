"use client";

import { ChevronDown, Database } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function FieldPicker({
    fields,
    onSelect,
    disabled = false,
}: {
    fields: string[];
    onSelect: (field: string) => void;
    disabled?: boolean;
}) {
    if (fields.length === 0) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                disabled={disabled}
                aria-label="Insert upstream field"
                className={cn(
                    "flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-dashed border-border/80 px-1.5 text-[11px] text-muted-foreground outline-none transition-colors duration-150",
                    "hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring",
                    disabled && "cursor-not-allowed opacity-50"
                )}
            >
                <Database className="size-3" aria-hidden="true" />
                <span>field</span>
                <ChevronDown className="size-3" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="w-44">
                {fields.map((field) => (
                    <DropdownMenuItem
                        key={field}
                        className="cursor-pointer text-[12px]"
                        onClick={() => onSelect(field)}
                    >
                        <code className="text-[11px] text-primary">{"{{"}{field}{"}}"}</code>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
