"use client";

import * as React from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { NodeTile } from "@modules/nodes/components/node-tile";
import { getConfigField, getSampleFields, getNode } from "@modules/nodes/lib";
import { FieldPicker } from "./field-picker";
import type { WorkflowEdge, WorkflowNode } from "@modules/canvas/lib/types";

function upstreamSampleFields(
    node: WorkflowNode,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
): string[] {
    const incoming = edges.filter((e) => e.target === node.id);
    const sources = new Set(incoming.map((e) => e.source));
    const fields = new Set<string>();
    for (const sourceId of sources) {
        const source = nodes.find((n) => n.id === sourceId);
        if (source) for (const field of getSampleFields(source.data.nodeType)) fields.add(field);
    }
    return [...fields];
}

export function NodeConfigPanel({
    node,
    nodes,
    edges,
    onNodeChange,
    onClose,
    onDelete,
}: {
    node: WorkflowNode;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    onNodeChange: (id: string, patch: Partial<WorkflowNode["data"]>) => void;
    onClose: () => void;
    onDelete: (id: string) => void;
}) {
    const definition = getNode(node.data.nodeType);
    const fields = getConfigField(node.data.nodeType);
    const upstreamFields = upstreamSampleFields(node, nodes, edges);

    const setConfigValue = (key: string, value: string) => {
        onNodeChange(node.id, { config: { ...node.data.config, [key]: value } });
    };

    const insertToken = (key: string, token: string) => {
        const current = String(node.data.config[key] ?? "");
        setConfigValue(key, current ? `${current}{{${token}}}` : `{{${token}}}`);
    };

    return (
        <aside
            aria-label="Step inspector"
            className="flex h-full w-80 shrink-0 flex-col border-l border-border/70 bg-background"
        >
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-4">
                <NodeTile type={node.data.nodeType} size="xs" />
                <Input
                    aria-label="Step name"
                    value={node.data.label}
                    onChange={(e) => onNodeChange(node.id, { label: e.target.value })}
                    className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-[13px] font-semibold shadow-none focus-visible:border-border focus-visible:bg-background"
                />
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close inspector"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <p className="text-[11px] leading-4 text-muted-foreground">
                    {definition?.description ?? definition?.label}
                </p>

                {fields.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">
                        This step needs no configuration.
                    </p>
                ) : (
                    fields.map((field) => {
                        const value = String(node.data.config[field.key] ?? "");
                        const describedBy = `field-${field.key}-help`;
                        return (
                            <div key={field.key} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor={`field-${field.key}`} className="text-[13px] font-medium text-foreground">
                                        {field.label}
                                    </Label>
                                    <FieldPicker
                                        fields={upstreamFields}
                                        onSelect={(token) => insertToken(field.key, token)}
                                    />
                                </div>

                                {field.type === "textarea" ? (
                                    <Textarea
                                        id={`field-${field.key}`}
                                        rows={4}
                                        value={value}
                                        onChange={(e) => setConfigValue(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        aria-describedby={describedBy}
                                        className="font-mono text-[12px]"
                                    />
                                ) : field.type === "select" ? (
                                    <Select
                                        value={value}
                                        onValueChange={(next) => setConfigValue(field.key, next ?? "")}
                                    >
                                        <SelectTrigger id={`field-${field.key}`} aria-describedby={describedBy} className="h-9 text-sm">
                                            <SelectValue placeholder={field.placeholder ?? "Select…"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(field.options ?? []).map((option) => (
                                                <SelectItem key={option} value={option} className="text-sm">
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent></Select>
                                ) : (
                                    <Input
                                        id={`field-${field.key}`}
                                        value={value}
                                        onChange={(e) => setConfigValue(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        aria-describedby={describedBy}
                                        className="h-9 text-sm"
                                    />
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <footer className="flex shrink-0 items-center justify-between border-t border-border/70 p-3">
                <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/70">
                    {node.data.nodeType}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(node.id)}
                    className="h-8 gap-1.5 text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Delete step
                </Button>
            </footer>
        </aside>
    );
}
