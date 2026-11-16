import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("OpenRouter catalogue", () => {
    const modelsPayload = {
        data: [
            { id: "openai/gpt-4o-mini", name: "GPT-4o mini", context_length: 128000, pricing: { prompt: "0.00000015", completion: "0.0000006" }, created: 1700000000, architecture: { input_modalities: ["text"], output_modalities: ["text"] }, supported_parameters: ["temperature"] },
            { id: "inclusionai/ling-3.2-flash:free", name: "Ling 3.2 Flash (free)", context_length: 1048576, pricing: { prompt: "0", completion: "0" }, created: 1700000001, architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] }, supported_parameters: [] },
        ],
    };

    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(modelsPayload), { status: 200, headers: { "content-type": "application/json" } })));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        // Force fresh module state so the cache does not leak between tests
        vi.resetModules();
    });

    it("classifies :free as free and zero-priced as free", async () => {
        vi.resetModules();
        const fresh = await import("./catalogue");
        const result = await fresh.fetchOpenRouterModels();
        expect("models" in result).toBe(true);
        if (!("models" in result)) return;
        const free = result.models.find((m) => m.id.endsWith(":free"));
        const paid = result.models.find((m) => m.id === "openai/gpt-4o-mini");
        expect(free?.isFree).toBe(true);
        expect(paid?.isFree).toBe(false);
        expect(paid?.promptPrice).toBe("0.00000015");
        expect(free?.contextLength).toBe(1048576);
    });

    it("sorts free models before paid models", async () => {
        vi.resetModules();
        const fresh = await import("./catalogue");
        const result = await fresh.fetchOpenRouterModels();
        if (!("models" in result)) throw new Error("expected models");
        const ids = result.models.map((m) => m.id);
        expect(ids[0]).toBe("inclusionai/ling-3.2-flash:free");
        expect(ids[1]).toBe("openai/gpt-4o-mini");
    });

    it("returns a typed error when the API fails and no cache exists", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response("err", { status: 503 })));
        vi.resetModules();
        const fresh = await import("./catalogue");
        const result = await fresh.fetchOpenRouterModels();
        expect("error" in result).toBe(true);
        if (!("error" in result)) return;
        expect(result.error).toContain("503");
    });
});

describe("requiredProviders / providerLabel", () => {
    it("derives providers from node types + AI config provider", async () => {
        const { requiredProviders, providerLabel } = await import("@/app/modules/templates/lib/templates");
        const t = {
            id: "x", name: "x", summary: "x", category: "ai" as const, iconType: "ai", tags: [],
            nodes: [
                { id: "a", type: "workflow", position: { x: 0, y: 0 }, data: { label: "Trigger", nodeType: "github-trigger", config: {}, status: "idle" as const } },
                { id: "b", type: "workflow", position: { x: 0, y: 0 }, data: { label: "AI", nodeType: "ai", config: { provider: "anthropic" }, status: "idle" as const } },
                { id: "c", type: "workflow", position: { x: 0, y: 0 }, data: { label: "Send", nodeType: "telegram-send", config: {}, status: "idle" as const } },
            ] as never,
            edges: [] as never,
        };
        expect(requiredProviders(t as never).sort()).toEqual(["anthropic", "github", "telegram"]);
        expect(providerLabel("github")).toBe("GitHub");
        expect(providerLabel("notion")).toBe("Notion");
        expect(providerLabel("google-calendar")).toBe("Google Calendar");
    });
});
