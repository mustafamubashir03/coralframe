/**
 * OpenRouter model catalogue — server-side only.
 *
 * Source: https://openrouter.ai/api/v1/models (public, unauthenticated).
 * The user's API key is never used for catalogue retrieval and never leaves the server.
 *
 * Caching: module-level cache with 5-minute TTL. On API failure, a stale cache
 * is served with `stale: true` so the UI can indicate it; otherwise an error is
 * returned (never a pretend-current fallback list).
 */

export type OpenRouterModel = {
    id: string;
    name: string;
    description: string;
    contextLength: number;
    promptPrice: string;
    completionPrice: string;
    isFree: boolean;
    inputModalities: string[];
    outputModalities: string[];
    supportedParameters: string[];
    created: number;
};

type Cache = {
    at: number;
    models: OpenRouterModel[];
    rawCount: number;
};

let cache: Cache | null = null;
const TTL_MS = 5 * 60 * 1000;

function parsePrice(value: unknown): string {
    if (value === undefined || value === null) return "0";
    const n = Number(value);
    if (!Number.isFinite(n)) return "0";
    // Avoid scientific notation for small per-token prices (e.g. 1.5e-7)
    return n.toFixed(12).replace(/\.?0+$/, "");
}

function isFree(id: string, prompt: string, completion: string): boolean {
    if (id.endsWith(":free")) return true;
    return Number(prompt) === 0 && Number(completion) === 0;
}

export async function fetchOpenRouterModels(): Promise<{ models: OpenRouterModel[]; rawCount: number; stale: boolean } | { error: string }> {
    if (cache && Date.now() - cache.at < TTL_MS) {
        return { models: cache.models, rawCount: cache.rawCount, stale: false };
    }
    try {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
            throw new Error(`OpenRouter catalogue returned HTTP ${response.status}`);
        }
        const body = (await response.json()) as {
            data?: Array<Record<string, unknown>>;
        };
        const raw = Array.isArray(body.data) ? body.data : [];
        const models: OpenRouterModel[] = raw
            .filter((entry) => typeof entry.id === "string" && entry.id)
            .map((entry) => {
                const pricing = (entry.pricing ?? {}) as Record<string, unknown>;
                const promptPrice = parsePrice(pricing.prompt);
                const completionPrice = parsePrice(pricing.completion);
                const architecture = (entry.architecture ?? {}) as Record<string, unknown>;
                const supported = Array.isArray(entry.supported_parameters)
                    ? (entry.supported_parameters as unknown[]).map(String)
                    : [];
                return {
                    id: String(entry.id),
                    name: typeof entry.name === "string" ? entry.name : String(entry.id),
                    description: typeof entry.description === "string" ? entry.description : "",
                    contextLength: Number(entry.context_length ?? 0) || 0,
                    promptPrice,
                    completionPrice,
                    isFree: isFree(String(entry.id), promptPrice, completionPrice),
                    inputModalities: Array.isArray(architecture.input_modalities)
                        ? (architecture.input_modalities as unknown[]).map(String)
                        : [],
                    outputModalities: Array.isArray(architecture.output_modalities)
                        ? (architecture.output_modalities as unknown[]).map(String)
                        : [],
                    supportedParameters: supported,
                    created: Number(entry.created ?? 0) || 0,
                };
            });
        // Free models first — newest first within each group.
        models.sort((a, b) => Number(b.isFree) - Number(a.isFree) || b.created - a.created);
        cache = { at: Date.now(), models, rawCount: raw.length };
        return { models, rawCount: raw.length, stale: false };
    } catch (error) {
        if (cache) {
            return { models: cache.models, rawCount: cache.rawCount, stale: true };
        }
        const detail = error instanceof Error ? error.message : String(error);
        return { error: `Couldn't load the OpenRouter model catalogue — ${detail}` };
    }
}
