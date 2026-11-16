import { describe, expect, it, beforeEach } from "vitest";
import {
    headerMap,
    queryMap,
    webhookItem,
    safeEqual,
    sign256,
    checkRateLimit,
} from "./webhook";

describe("headerMap", () => {
    it("drops secret-carrying headers", () => {
        const headers = new Headers({
            "content-type": "application/json",
            "x-webhook-secret": "topsecret",
            "authorization": "Bearer abc",
            "x-hub-signature-256": "sha256=deadbeef",
            "x-custom": "keep",
        });
        const map = headerMap(headers);
        expect(map["content-type"]).toBe("application/json");
        expect(map["x-webhook-secret"]).toBeUndefined();
        expect(map["authorization"]).toBeUndefined();
        expect(map["x-hub-signature-256"]).toBeUndefined();
        expect(map["x-custom"]).toBe("keep");
    });
});

describe("webhookItem", () => {
    it("builds the canonical body/headers/query shape", () => {
        const request = new Request("https://example.com/hook?a=1&b=two", {
            method: "POST",
            headers: { "content-type": "application/json" },
        });
        const item = webhookItem(request, { hello: "world" }) as { body: unknown; query: Record<string, string> };
        expect(item.body).toEqual({ hello: "world" });
        expect(item.query).toEqual({ a: "1", b: "two" });
    });

    it("queryMap flattens multi-value keys to last-wins", () => {
        const map = queryMap("https://x.test/?a=1&a=2");
        expect(map.a).toBe("2");
    });
});

describe("signature verification", () => {
    it("safeEqual matches identical strings", () => {
        expect(safeEqual("topsecret", "topsecret")).toBe(true);
    });
    it("safeEqual rejects different strings of same length", () => {
        expect(safeEqual("topsecret1", "topsecret2")).toBe(false);
    });
    it("safeEqual rejects different-length strings", () => {
        expect(safeEqual("short", "much-longer-string")).toBe(false);
    });
    it("sign256 produces stable HMAC output", () => {
        const sig = sign256("secret", "body");
        expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
        expect(sig).toBe(sign256("secret", "body"));
        expect(sig).not.toBe(sign256("secret", "body!"));
    });
});

describe("rate limiter", () => {
    beforeEach(() => {
        // Force a fresh bucket by using a unique key per test
    });

    it("allows up to the limit then blocks", () => {
        const key = `t:${Date.now()}-a`;
        for (let i = 0; i < 120; i++) expect(checkRateLimit(key).allowed).toBe(true);
        expect(checkRateLimit(key).allowed).toBe(false);
    });

    it("tracks keys independently", () => {
        const keyA = `t:${Date.now()}-b`;
        const keyB = `t:${Date.now()}-c`;
        for (let i = 0; i < 120; i++) expect(checkRateLimit(keyA).allowed).toBe(true);
        expect(checkRateLimit(keyA).allowed).toBe(false);
        expect(checkRateLimit(keyB).allowed).toBe(true);
    });

    it("reports a positive retryAfter", () => {
        const key = `t:${Date.now()}-d`;
        for (let i = 0; i < 120; i++) checkRateLimit(key);
        const result = checkRateLimit(key);
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeGreaterThan(0);
    });
});
