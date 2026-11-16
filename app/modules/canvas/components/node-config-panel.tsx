"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Trash2, X, XCircle } from "lucide-react";
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
import { listWorkspaceCredentials } from "@/app/modules/credentials/actions";
import { OpenRouterModelSelect } from "@modules/openrouter/components/openrouter-model-select";
import { useExecutionOverlay } from "@modules/canvas/components/execution-context";
import type { WorkflowEdge, WorkflowNode } from "@modules/canvas/lib/types";

const SECRET_FIELD = /token|secret|api[-_]?key|password|signature/i;
const AI_PROVIDERS = new Set(["openrouter", "openai", "anthropic", "google"]);

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
    const { overlay } = useExecutionOverlay();
    const liveRun = overlay[node.id];
    const runError = liveRun?.status === "error" ? liveRun.errorMessage : undefined;
    const secretFields = fields.filter((field) => SECRET_FIELD.test(field.key));
    const [credentials, setCredentials] = React.useState<Awaited<ReturnType<typeof listWorkspaceCredentials>>>([]);
    const isAiNode = node.data.nodeType === "ai";
    const aiProvider = String(node.data.config.provider ?? "openrouter");
    const aiCredentials = credentials.filter((cred) => AI_PROVIDERS.has(cred.provider));
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await listWorkspaceCredentials();
                if (!cancelled) setCredentials(list);
            } catch {
                // Credential listing is non-critical — the panel still works with inline secrets.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const credentialId = typeof node.data.config.credentialId === "string" ? (node.data.config.credentialId as string) : "";
    const isSecretKey = (key: string) => SECRET_FIELD.test(key) || key === "credentialId";

    const setCredentialId = (id: string) => {
        const next: Record<string, string> = {};
        for (const [key, value] of Object.entries(node.data.config)) {
            if (isSecretKey(key)) continue;
            if (typeof value === "string") next[key] = value;
        }
        if (id) next.credentialId = id;
        onNodeChange(node.id, { config: next });
    };

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
                {liveRun?.status === "running" && (
                    <Loader2 className="size-4 shrink-0 animate-spin text-amber-500" aria-label="Running" role="status" />
                )}
                {liveRun?.status === "success" && (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-label="Step succeeded" />
                )}
                {liveRun?.status === "error" && (
                    <XCircle className="size-4 shrink-0 text-destructive" aria-label="Step failed" />
                )}
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

                {(secretFields.length > 0 || isAiNode) && (
                    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="node-credential" className="text-[12px] font-semibold text-foreground">
                                {isAiNode ? "AI provider credential" : "Credential"}
                            </Label>
                            <a href="/credentials" className="text-[11px] font-medium text-primary hover:underline">
                                Manage
                            </a>
                        </div>
                        <select
                            id="node-credential"
                            value={credentialId}
                            onChange={(e) => setCredentialId(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">Inline secret (not encrypted)</option>
                            {(isAiNode ? aiCredentials : credentials).map((cred) => (
                                <option key={cred.id} value={cred.id}>
                                    {cred.name} ({cred.provider})
                                </option>
                            ))}
                        </select>
                        {isAiNode && aiCredentials.length === 0 && (
                            <p className="text-[11px] leading-4 text-muted-foreground">
                                No AI provider credentials yet — <a href="/credentials" className="text-primary hover:underline">add one</a> and it will appear here.
                            </p>
                        )}
                        {credentialId && (
                            <p className="text-[11px] leading-4 text-muted-foreground">
                                {isAiNode ? "API key is sourced from this credential — never stored on the node." : "Secret fields below are sourced from this credential and are not stored on the node."}
                            </p>
                        )}
                    </div>
                )}

                {runError && (
                    <div
                        role="alert"
                        className="rounded-lg border border-destructive/30 bg-destructive/[0.08] px-3 py-2 text-[12px] leading-4 text-destructive"
                    >
                        <span className="font-semibold">Last run failed. </span>
                        {runError}
                    </div>
                )}

                {fields.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">
                        This step needs no configuration.
                    </p>
                ) : (
                    fields.map((field) => {
                        const value = String(node.data.config[field.key] ?? "");
                        const describedBy = `field-${field.key}-help`;
                        const isSecret = SECRET_FIELD.test(field.key);
                        const isCredentialBacked = Boolean(credentialId) && isSecret;
                        return (
                            <div key={field.key} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor={`field-${field.key}`} className="text-[13px] font-medium text-foreground">
                                        {field.label}
                                    </Label>
                                    {isAiNode && field.key === "model" && aiProvider === "openrouter" ? null : (
                                        <FieldPicker
                                            fields={upstreamFields}
                                            onSelect={(token) => insertToken(field.key, token)}
                                        />
                                    )}
                                </div>

                                {field.type === "textarea" ? (
                                    <Textarea
                                        id={`field-${field.key}`}
                                        rows={4}
                                        value={isCredentialBacked ? "" : value}
                                        disabled={isCredentialBacked}
                                        onChange={(e) => setConfigValue(field.key, e.target.value)}
                                        placeholder={isCredentialBacked ? "Provided by credential" : field.placeholder}
                                        aria-describedby={describedBy}
                                        className="font-mono text-[12px] disabled:opacity-60"
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
                                ) : isAiNode && field.key === "model" && aiProvider === "openrouter" ? (
                                    <OpenRouterModelSelect value={value} onChange={(next) => setConfigValue(field.key, next)} />
                                ) : (
                                    <Input
                                        id={`field-${field.key}`}
                                        value={isCredentialBacked ? "" : value}
                                        disabled={isCredentialBacked}
                                        onChange={(e) => setConfigValue(field.key, e.target.value)}
                                        placeholder={isCredentialBacked ? "Provided by credential" : field.placeholder}
                                        aria-describedby={describedBy}
                                        className="h-9 text-sm disabled:opacity-60"
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
