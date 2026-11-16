"use server";

import { requireAuth } from "@/app/modules/auth/actions";
import { listCredentials, createCredential, updateCredential, deleteCredential } from "@/lib/credentials";
import { testCredential as validateCredential } from "@/lib/credential-validation";
import { redactValue } from "@/lib/redact";

/** List the workspace's credentials — metadata only, never secret material. */
export async function listWorkspaceCredentials() {
    const user = await requireAuth();
    return listCredentials(user.id);
}

export async function createWorkspaceCredential(
    name: string,
    provider: string,
    payload: Record<string, string>,
) {
    const user = await requireAuth();
    const trimmedName = String(name ?? "").trim();
    const trimmedProvider = String(provider ?? "").trim();
    if (!trimmedName) return { ok: false as const, error: "Give the credential a name." };
    if (!trimmedProvider) return { ok: false as const, error: "Pick a provider." };

    // Drop empty keys/values so we never persist a half-filled secret bag.
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload ?? {})) {
        const k = String(key).trim();
        const v = String(value ?? "");
        if (k && v) clean[k] = v;
    }
    if (Object.keys(clean).length === 0) {
        return { ok: false as const, error: "Provide at least one secret value." };
    }

    const credential = await createCredential(user.id, trimmedName, trimmedProvider, clean);
    return { ok: true as const, credential };
}

export async function updateWorkspaceCredential(
    id: string,
    patch: { name?: string; provider?: string; payload?: Record<string, string> },
) {
    const user = await requireAuth();
    const credential = await updateCredential(user.id, id, {
        name: patch.name?.trim(),
        provider: patch.provider?.trim(),
        payload: patch.payload,
    });
    if (!credential) return { ok: false as const, error: "Credential not found." };
    return { ok: true as const, credential };
}

export async function deleteWorkspaceCredential(id: string) {
    const user = await requireAuth();
    const deleted = await deleteCredential(user.id, id);
    return { ok: deleted as boolean, ...(deleted ? {} : { error: "Credential not found." }) };
}

/** Test a stored credential against the provider's official API. */
export async function testWorkspaceCredential(id: string) {
    if (!id) return { ok: false as const, error: "Missing credential id." };
    return validateCredential(id);
}

/** Redact secrets from a nodes/edges graph for frontend retrieval. */
export async function redactWorkflowGraph(nodes: unknown, edges: unknown) {
    return { nodes: redactValue(nodes), edges: redactValue(edges) };
}
