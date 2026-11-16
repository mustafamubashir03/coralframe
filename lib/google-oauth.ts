/**
 * Google OAuth token exchange for offline access.
 *
 * Google's refresh tokens minted with access_type=offline can be exchanged
 * for short-lived access tokens without user interaction. This lets an
 * integration node act on the user's behalf with only a refresh token — the
 * right fit for server-side automations.
 */

export async function refreshGoogleAccessToken(input: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: input.clientId,
            client_secret: input.clientSecret,
            refresh_token: input.refreshToken,
            grant_type: "refresh_token",
        }),
        signal: AbortSignal.timeout(10_000),
    });

    const body = (await response.json().catch(() => null)) as {
        access_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
    } | null;

    if (!response.ok || !body?.access_token) {
        const detail = body?.error_description ?? body?.error ?? `HTTP ${response.status}`;
        throw new Error(`Google token refresh failed — ${detail}`);
    }

    return { accessToken: body.access_token, expiresIn: body.expires_in ?? 3600 };
}
