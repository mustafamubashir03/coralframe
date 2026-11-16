"use server";

import { requireAuth } from "@/app/modules/auth/actions";
import { fetchOpenRouterModels, type OpenRouterModel } from "../lib/catalogue";

/**
 * Workspace-facing catalogue action. Returns metadata only — the user's API
 * key never leaves the server, and catalogue reads don't require one.
 */
export async function getOpenRouterCatalogue(): Promise<
    | { ok: true; models: OpenRouterModel[]; rawCount: number; stale: boolean }
    | { ok: false; error: string }
> {
    await requireAuth();
    const result = await fetchOpenRouterModels();
    if ("error" in result) return { ok: false, error: result.error };
    return { ok: true, models: result.models, rawCount: result.rawCount, stale: result.stale };
}
