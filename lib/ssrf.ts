import { lookup } from "node:dns/promises";
import net from "node:net";

export type SsrfDecision = { ok: true; ips: string[] } | { ok: false; reason: string };

const METADATA_HOSTNAMES = new Set([
    "metadata.google.internal",
    "metadata",
    "169.254.169.254",
    "metadata.azure.com",
    "metadata.azure.net",
    "host.docker.internal",
    "kubernetes.default",
    "kubernetes.default.svc",
    "consul",
    "vault",
    "nomad",
    "localhost",
    "localhost.localdomain",
    "ip6-localhost",
    "ip6-loopback",
    "broadcasthost",
]);

function isPrivateIPv4(ip: string): boolean {
    const octets = ip.split(".").map(Number);
    if (octets.length !== 4 || octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = octets;
    if (a === 0) return true;                                     // 0.0.0.0/8 "this" network
    if (a === 10) return true;                                    // RFC1918
    if (a === 127) return true;                                   // loopback
    if (a === 169 && b === 254) return true;                      // link-local (incl. metadata)
    if (a === 172 && b >= 16 && b <= 31) return true;             // RFC1918
    if (a === 192 && b === 168) return true;                      // RFC1918
    if (a === 100 && b >= 64 && b <= 127) return true;            // CGNAT
    if (a === 192 && b === 0 && octets[2] === 2) return true;     // TEST-NET-1 (documentation)
    if (a === 198 && b === 18) return true;                       // benchmarking
    if (a === 198 && b === 19) return true;
    if (a >= 224) return true;                                    // multicast/reserved incl. 240/4
    return false;
}

function isPrivateIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;         // loopback / unspecified
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;   // unique local fc00::/7
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
        normalized.startsWith("fea") || normalized.startsWith("feb")) return true; // link-local fe80::/10
    // IPv4-mapped IPv6 ::ffff:a.b.c.d
    const v4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4) return isPrivateIPv4(v4[1]);
    // IPv4-compatible ::a.b.c.d (deprecated but accepted)
    const compat = normalized.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
    if (compat) return isPrivateIPv4(compat[1]);
    return false;
}

function isPrivateIP(ip: string): boolean {
    if (net.isIPv4(ip)) return isPrivateIPv4(ip);
    if (net.isIPv6(ip)) return isPrivateIPv6(ip);
    // Unrecognized or non-IP literals are not allowed.
    return true;
}

/**
 * Decide whether a URL is safe to fetch. Checks the hostname directly, then
 * resolves DNS and inspects every returned address — this blocks DNS rebinding
 * where a public-looking name resolves to a private address.
 */
export async function checkUrlSafety(rawUrl: string): Promise<SsrfDecision> {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return { ok: false, reason: "Invalid URL." };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { ok: false, reason: `Unsupported protocol "${url.protocol}" — only http and https are allowed.` };
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!hostname) {
        return { ok: false, reason: "URL has no host." };
    }
    if (METADATA_HOSTNAMES.has(hostname)) {
        return { ok: false, reason: "This host is not allowed." };
    }
    // Direct IP literal in the URL
    if (net.isIP(hostname)) {
        return isPrivateIP(hostname)
            ? { ok: false, reason: "This address is a private or reserved network address." }
            : { ok: true, ips: [hostname] };
    }

    // Resolve DNS and inspect every address
    let addresses: { address: string; family: number }[];
    try {
        addresses = await lookup(hostname, { all: true, verbatim: false });
    } catch {
        return { ok: false, reason: `Could not resolve "${hostname}".` };
    }
    if (addresses.length === 0) {
        return { ok: false, reason: `Could not resolve "${hostname}".` };
    }
    for (const { address } of addresses) {
        if (isPrivateIP(address)) {
            return { ok: false, reason: `Host "${hostname}" resolves to a private or reserved address (${address}).` };
        }
    }
    return { ok: true, ips: addresses.map((a) => a.address) };
}

/** Maximum number of redirect hops we will follow. */
const MAX_REDIRECTS = 5;

/**
 * Fetch with per-hop SSRF validation. Every redirect target is re-checked
 * against the same rules, so a public URL cannot redirect to an internal one.
 */
export async function safeFetch(
    rawUrl: string,
    init: RequestInit = {},
    signal?: AbortSignal,
): Promise<Response> {
    let currentUrl = rawUrl;
    let hops = 0;

    for (;;) {
        const decision = await checkUrlSafety(currentUrl);
        if (!decision.ok) {
            throw new Error(decision.reason);
        }
        const response = await fetch(currentUrl, {
            ...init,
            redirect: "manual",
            signal: signal ?? AbortSignal.timeout(15_000),
        });
        const status = response.status;
        const isRedirect = status >= 300 && status < 400 && response.headers.has("location");
        if (!isRedirect) {
            return response;
        }
        hops += 1;
        if (hops > MAX_REDIRECTS) {
            throw new Error("Too many redirects.");
        }
        const location = response.headers.get("location");
        if (!location) return response;
        // Resolve relative redirect targets against the current URL
        let nextUrl: string;
        try {
            nextUrl = new URL(location, currentUrl).toString();
        } catch {
            throw new Error("Redirect location was not a valid URL.");
        }
        currentUrl = nextUrl;
    }
}
