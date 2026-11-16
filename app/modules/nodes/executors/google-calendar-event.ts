import { interpolate } from "@/app/modules/engine/lib/template";
import { resolveConfigSecret } from "@/lib/credentials";
import { refreshGoogleAccessToken } from "@/lib/google-oauth";
import type { ExecutorArgs, ExecutorResult } from "./index";

const TIMEOUT_MS = 15_000;

/**
 * Google Calendar Event — POST to the Calendar v3 events endpoint.
 * Requires an OAuth access token with calendar.events scope.
 */
export async function googleCalendarEvent({ node, item, userId }: ExecutorArgs): Promise<ExecutorResult> {
    const config = node.data.config ?? {};
    // Priority: explicit token > stored credential > env refresh-token exchange.
    let token = await resolveConfigSecret(userId, config, "token");
    if (!token) {
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (refreshToken && clientId && clientSecret) {
            const { accessToken } = await refreshGoogleAccessToken({
                clientId,
                clientSecret,
                refreshToken,
            });
            token = accessToken;
        }
    }
    if (!token) {
        throw new Error(
            "Google Calendar Event: no access token available. Configure a credential, an inline token, or set GOOGLE_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env."
        );
    }
    const calendarId = interpolate(String(config.calendarId ?? ""), item).trim() || "primary";
    const summary = interpolate(String(config.summary ?? ""), item).trim();
    if (!summary) {
        throw new Error("Google Calendar Event: summary is empty — set it on the node (e.g. {{title}}).");
    }
    const start = interpolate(String(config.start ?? ""), item).trim();
    if (!start) {
        throw new Error("Google Calendar Event: start time is required — set it on the node (e.g. {{start}}).");
    }
    const end = interpolate(String(config.end ?? ""), item).trim();
    if (!end) {
        throw new Error("Google Calendar Event: end time is required — set it on the node (e.g. {{end}}).");
    }
    // Light validation: Google accepts RFC3339 / ISO8601 strings.
    if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
        throw new Error("Google Calendar Event: start/end must be valid RFC3339 timestamps (e.g. 2026-11-15T10:00:00Z).");
    }

    let response: Response;
    try {
        response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            {
                method: "POST",
                headers: {
                    authorization: `Bearer ${token}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    summary,
                    start: { dateTime: start },
                    end: { dateTime: end },
                }),
                signal: AbortSignal.timeout(TIMEOUT_MS),
            },
        );
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Google Calendar Event: request failed — ${detail}`);
    }

    const payload = (await response.json().catch(() => null)) as { id?: string; htmlLink?: string; error?: { message?: string } } | null;
    if (!response.ok) {
        throw new Error(`Google Calendar Event: ${response.status} — ${payload?.error?.message ?? "request rejected by Google"}`);
    }

    const output = { id: payload?.id, htmlLink: payload?.htmlLink, calendarId };
    return { item: { ...item, ...output }, output };
}
