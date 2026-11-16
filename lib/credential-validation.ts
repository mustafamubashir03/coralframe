"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/app/modules/auth/actions";
import type { CredentialPayload } from "./credentials";
import { decryptCredential } from "./credentials";

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Provider-aware credential validation — used by the "Test" button in the
 * credentials UI. Calls the lightest official read endpoint per provider.
 * Never logs or returns secret values.
 */
export async function testCredential(credentialId: string): Promise<ValidationResult> {
    const user = await requireAuth();
    const row = await prisma.credential.findFirst({ where: { id: credentialId, userId: user.id } });
    if (!row) return { ok: false, error: "Credential not found." };
    let payload: CredentialPayload;
    try {
        payload = decryptCredential(Buffer.from(row.encryptedData));
    } catch {
        return { ok: false, error: "Couldn't decrypt this credential — recreate it." };
    }
    const token = (
        payload.apiKey ??
        payload.token ??
        payload.botToken ??
        payload.accessToken ??
        payload.refreshToken ??
        payload.key ??
        ""
    ).trim();
    if (!token) return { ok: false, error: "No secret value stored — recreate it with a valid key." };

    const timeout = AbortSignal.timeout(10_000);
    try {
        switch (row.provider.toLowerCase()) {
            case "github": {
                const r = await fetch("https://api.github.com/user", {
                    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" },
                    signal: timeout,
                });
                if (r.ok) return { ok: true };
                const body = (await r.json().catch(() => null)) as { message?: string } | null;
                return { ok: false, error: describeGithubError(r.status, body?.message) };
            }
            case "notion": {
                const r = await fetch("https://api.notion.com/v1/users/me", {
                    headers: { authorization: `Bearer ${token}`, "notion-version": "2022-06-28" },
                    signal: timeout,
                });
                if (r.ok) return { ok: true };
                const j = (await r.json().catch(() => null)) as { message?: string; code?: string } | null;
                return { ok: false, error: `Notion rejected the token (HTTP ${r.status}) — ${j?.message ?? j?.code ?? "invalid integration token"}` };
            }
            case "telegram": {
                const r = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: timeout });
                const j = (await r.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
                if (r.ok && j?.ok) return { ok: true };
                return { ok: false, error: `Telegram rejected the bot token — ${j?.description ?? `HTTP ${r.status}`}` };
            }
            case "openrouter": {
                const r = await fetch("https://openrouter.ai/api/v1/credits", {
                    headers: { authorization: `Bearer ${token}` },
                    signal: timeout,
                });
                if (r.ok) return { ok: true };
                const j = (await r.json().catch(() => null)) as { error?: { message?: string } | string } | null;
                const message = typeof j?.error === "string" ? j.error : j?.error?.message;
                return { ok: false, error: `OpenRouter rejected the key (HTTP ${r.status})${message ? ` — ${message}` : ""}` };
            }
            case "openai": {
                const r = await fetch("https://api.openai.com/v1/models", {
                    headers: { authorization: `Bearer ${token}` },
                    signal: timeout,
                });
                if (r.ok) return { ok: true };
                return { ok: false, error: `OpenAI rejected the key (HTTP ${r.status}).` };
            }
            case "anthropic": {
                const r = await fetch("https://api.anthropic.com/v1/models", {
                    headers: { "x-api-key": token, "anthropic-version": "2023-06-01" },
                    signal: timeout,
                });
                if (r.ok) return { ok: true };
                const j = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
                return { ok: false, error: `Anthropic rejected the key (HTTP ${r.status})${j?.error?.message ? ` — ${j.error.message}` : ""}` };
            }
            case "google":
            case "gemini": {
                const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(token)}`, { signal: timeout });
                if (r.ok) return { ok: true };
                const j = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
                return { ok: false, error: `Google rejected the key (HTTP ${r.status})${j?.error?.message ? ` — ${j.error.message}` : ""}` };
            }
            case "google-calendar":
            case "googlecalendar": {
                // Validate via the token exchange + calendarList
                const clientId = process.env.GOOGLE_CLIENT_ID;
                const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
                if (!clientId || !clientSecret) {
                    return { ok: false, error: "Google OAuth env (GOOGLE_CLIENT_ID/SECRET) is not configured — ask an admin." };
                }
                const exchange = await fetch("https://oauth2.googleapis.com/token", {
                    method: "POST",
                    headers: { "content-type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        refresh_token: token,
                        grant_type: "refresh_token",
                    }),
                    signal: timeout,
                });
                const exchangeBody = (await exchange.json().catch(() => null)) as { access_token?: string; error?: string; error_description?: string } | null;
                if (!exchange.ok || !exchangeBody?.access_token) {
                    return { ok: false, error: `Google rejected the refresh token — ${exchangeBody?.error_description ?? exchangeBody?.error ?? `HTTP ${exchange.status}`}` };
                }
                const list = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
                    headers: { authorization: `Bearer ${exchangeBody.access_token}` },
                    signal: timeout,
                });
                if (list.ok) return { ok: true };
                return { ok: false, error: `Google token exchanged but calendarList read failed (HTTP ${list.status}) — missing calendar scope?` };
            }
            default:
                return { ok: false, error: `No validation endpoint configured for "${row.provider}" — credential stored but untested.` };
        }
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return { ok: false, error: `Couldn't reach ${row.provider} — ${detail}` };
    }
}

function describeGithubError(status: number, message?: string): string {
    if (status === 401) return "GitHub rejected the token (401) — it's invalid or revoked.";
    if (status === 403) return "GitHub rejected the token (403) — check the token's scopes.";
    if (status === 404) return "GitHub returned 404 — the token has no access to this resource.";
    return `GitHub rejected the token (HTTP ${status})${message ? ` — ${message}` : ""}`;
}
