import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { interpolate } from "../../engine/lib/template";
import { resolveCredential } from "@/lib/credentials";
import type { ExecutorArgs, ExecutorResult } from "./index";

const PROVIDERS = ["openrouter", "openai", "anthropic", "google"] as const;
type Provider = (typeof PROVIDERS)[number];

const DEFAULT_MODEL: Record<Provider, string> = {
    openrouter: "openai/gpt-4o-mini",
    openai: "gpt-4o-mini",
    anthropic: "claude-sonnet-4-5",
    google: "gemini-2.5-flash",
};

const KEY_ENV: Record<Provider, string> = {
    openrouter: "OPENROUTER_API_KEY",
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    google: "GOOGLE_API_KEY",
};

const KEY_CREDENTIAL_FIELD: Record<Provider, string> = {
    openrouter: "apiKey",
    openai: "apiKey",
    anthropic: "apiKey",
    google: "apiKey",
};

function pickModel(provider: Provider, configured: string | undefined) {
    const model = String(configured ?? "").trim();
    return model || DEFAULT_MODEL[provider];
}

/**
 * Resolve the provider API key: explicit workspace credential wins; raw inline
 * value is accepted for backward compatibility (redacted everywhere); env var
 * is the deployment-level fallback.
 */
async function resolveProviderKey(
    provider: Provider,
    userId: string,
    config: Record<string, unknown>,
): Promise<string> {
    const credentialId = typeof config.credentialId === "string" ? config.credentialId.trim() : "";
    if (credentialId) {
        const payload = await resolveCredential(userId, credentialId);
        const value = payload[KEY_CREDENTIAL_FIELD[provider]] ?? payload.token ?? payload.apiKey ?? payload.password ?? payload.secret;
        if (typeof value === "string" && value.trim()) return value.trim();
        throw new Error(`The selected credential does not contain an API key for ${provider}.`);
    }
    const inline = config[KEY_CREDENTIAL_FIELD[provider]];
    if (typeof inline === "string" && inline.trim()) return inline.trim();
    const envValue = process.env[KEY_ENV[provider]];
    if (envValue) return envValue;
    throw new Error(
        `AI: no ${provider} credential configured. Add it in Credentials, or set ${KEY_ENV[provider]} for the deployment.`
    );
}

function buildModel(provider: Provider, model: string, apiKey: string): BaseChatModel {
    switch (provider) {
        case "openai":
            return new ChatOpenAI({ apiKey, model });
        case "anthropic":
            return new ChatAnthropic({ apiKey, model });
        case "google":
            return new ChatGoogleGenerativeAI({ apiKey, model });
        case "openrouter":
            return new ChatOpenRouter({ apiKey, model });
    }
}

/**
 * AI — interpolates the prompt (including {{field}} placeholders), calls the
 * configured chat model, and replaces the running payload with
 * `{ ...item, response }` so downstream steps can read {{response}}.
 */
export async function aiExecutor({ node, item, userId }: ExecutorArgs): Promise<ExecutorResult> {
    const config = node.data.config ?? {};

    const provider = String(config.provider ?? "openrouter").toLowerCase() as Provider;
    if (!PROVIDERS.includes(provider)) {
        throw new Error(`AI: unsupported provider "${config.provider}". Supported: ${PROVIDERS.join(", ")}.`);
    }

    const promptTemplate = String(config.prompt ?? "").trim();
    if (!promptTemplate) {
        throw new Error("AI: prompt is empty — set it in the node config, e.g. \"Summarize: {{text}}\".");
    }
    const systemTemplate = String(config.systemPrompt ?? "").trim();

    const prompt = interpolate(promptTemplate, item);
    const systemPrompt = systemTemplate ? interpolate(systemTemplate, item) : undefined;

    const apiKey = await resolveProviderKey(provider, userId, config);
    const model = buildModel(provider, pickModel(provider, config.model as string | undefined), apiKey);

    const messages = [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        { role: "user" as const, content: prompt },
    ];

    let response: Awaited<ReturnType<typeof model.invoke>>;
    try {
        response = await model.invoke(messages);
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`AI (${provider}/${pickModel(provider, config.model as string | undefined)}): ${detail}`);
    }

    const rawContent = response.content;
    const content = typeof rawContent === "string"
        ? rawContent
        : (Array.isArray(rawContent)
            ? (rawContent as Array<string | { text?: unknown }>)
                .map((part) => (typeof part === "string" ? part : String(part?.text ?? "")))
                .join("")
            : String(rawContent ?? ""));

    const nextItem = { ...item, response: content };
    return { item: nextItem, output: { response: content } };
}
