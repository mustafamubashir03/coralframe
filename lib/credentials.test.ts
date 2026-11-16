import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const KEY_A = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const KEY_B = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

describe("credential encryption (AES-256-GCM)", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.CREDENTIALS_ENCRYPTION_KEY = KEY_A;
    });

    afterEach(() => {
        delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    });

    it("round-trips a payload", async () => {
        const { encryptCredential, decryptCredential } = await import("./credentials");
        const blob = encryptCredential({ apiKey: "sk-test-1234567890", region: "eu" });
        const out = decryptCredential(blob);
        expect(out).toEqual({ apiKey: "sk-test-1234567890", region: "eu" });
    });

    it("produces different ciphertext for identical payloads (random IV)", async () => {
        const { encryptCredential } = await import("./credentials");
        const a = encryptCredential({ k: "v" });
        const b = encryptCredential({ k: "v" });
        expect(Buffer.compare(a, b)).not.toBe(0);
    });

    it("rejects decryption with a different key", async () => {
        const { encryptCredential } = await import("./credentials");
        const blob = encryptCredential({ secret: "topsecret-value" });
        vi.resetModules();
        process.env.CREDENTIALS_ENCRYPTION_KEY = KEY_B;
        const { decryptCredential } = await import("./credentials");
        expect(() => decryptCredential(blob)).toThrow();
    });

    it("rejects tampered ciphertext", async () => {
        const { encryptCredential, decryptCredential } = await import("./credentials");
        const blob = encryptCredential({ secret: "abcd1234abcd1234abcd1234abcd1234" });
        blob[blob.length - 1] ^= 0xff;
        expect(() => decryptCredential(blob)).toThrow();
    });

    it("does not embed the plaintext secret in the ciphertext", async () => {
        const { encryptCredential } = await import("./credentials");
        const secret = "sk-super-secret-value-123456";
        const blob = encryptCredential({ apiKey: secret });
        expect(blob.includes(Buffer.from(secret, "utf8"))).toBe(false);
    });

    it("throws a clear error when the encryption key is missing", async () => {
        delete process.env.CREDENTIALS_ENCRYPTION_KEY;
        const { encryptCredential } = await import("./credentials");
        expect(() => encryptCredential({ k: "v" })).toThrow(/CREDENTIALS_ENCRYPTION_KEY/);
    });
});

describe("resolveConfigSecret — fallbacks", () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.CREDENTIALS_ENCRYPTION_KEY = KEY_A;
    });

    afterEach(() => {
        delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    });

    it("returns raw config values when no credentialId is referenced", async () => {
        const { resolveConfigSecret } = await import("./credentials");
        const value = await resolveConfigSecret(
            "user_x",
            { token: "raw-token" },
            "token",
        );
        expect(value).toBe("raw-token");
    });

    it("returns empty string for missing raw config values (no throw)", async () => {
        const { resolveConfigSecret } = await import("./credentials");
        expect(await resolveConfigSecret("user_x", {}, "token")).toBe("");
    });
});
