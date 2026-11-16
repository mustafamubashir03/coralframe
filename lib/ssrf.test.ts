import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkUrlSafety } from "./ssrf";

vi.mock("node:dns/promises", () => ({
    lookup: vi.fn(),
}));

import { lookup } from "node:dns/promises";

const mockedLookup = vi.mocked(lookup);

function mockDns(addresses: { address: string; family: number }[]) {
    // @ts-expect-error — the mocked signature is looser than the real one
    mockedLookup.mockResolvedValue(addresses);
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("checkUrlSafety — blocked destinations", () => {
    it("blocks loopback literals", async () => {
        expect((await checkUrlSafety("http://127.0.0.1/")).ok).toBe(false);
        expect((await checkUrlSafety("http://localhost/")).ok).toBe(false);
        expect((await checkUrlSafety("http://[::1]/")).ok).toBe(false);
        expect((await checkUrlSafety("http://0.0.0.0/")).ok).toBe(false);
    });

    it("blocks RFC1918 private ranges", async () => {
        expect((await checkUrlSafety("http://10.0.0.5/")).ok).toBe(false);
        expect((await checkUrlSafety("http://172.16.0.1/")).ok).toBe(false);
        expect((await checkUrlSafety("http://172.31.255.255/")).ok).toBe(false);
        expect((await checkUrlSafety("http://192.168.1.1/")).ok).toBe(false);
        expect((await checkUrlSafety("http://100.64.0.1/")).ok).toBe(false);
    });

    it("blocks link-local and cloud metadata", async () => {
        expect((await checkUrlSafety("http://169.254.169.254/latest/meta-data")).ok).toBe(false);
        expect((await checkUrlSafety("http://169.254.0.1/")).ok).toBe(false);
        expect((await checkUrlSafety("http://metadata.google.internal/")).ok).toBe(false);
    });

    it("blocks IPv6 private/link-local/unique-local", async () => {
        expect((await checkUrlSafety("http://[fe80::1]/")).ok).toBe(false);
        expect((await checkUrlSafety("http://[fc00::1]/")).ok).toBe(false);
        expect((await checkUrlSafety("http://[fdff::1]/")).ok).toBe(false);
        expect((await checkUrlSafety("http://[::1]/")).ok).toBe(false);
    });

    it("blocks DNS answers that resolve to private space (rebinding)", async () => {
        mockDns([{ address: "127.0.0.1", family: 4 }]);
        const result = await checkUrlSafety("https://rebind.example.com/");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toContain("private");
    });

    it("blocks DNS answers resolving to metadata addresses", async () => {
        mockDns([{ address: "169.254.169.254", family: 4 }]);
        const result = await checkUrlSafety("https://sneaky.example.com/");
        expect(result.ok).toBe(false);
    });

    it("blocks unparseable hosts", async () => {
        mockDns([]);
        mockedLookup.mockRejectedValue(new Error("ENOTFOUND"));
        const result = await checkUrlSafety("https://does-not-resolve.example/");
        expect(result.ok).toBe(false);
    });

    it("rejects non-http(s) protocols", async () => {
        expect((await checkUrlSafety("file:///etc/passwd")).ok).toBe(false);
        expect((await checkUrlSafety("ftp://example.com/")).ok).toBe(false);
        expect((await checkUrlSafety("gopher://example.com/")).ok).toBe(false);
    });

    it("rejects decimal-IP bypasses that resolve to loopback", async () => {
        // 2130706433 == 127.0.0.1
        mockDns([{ address: "127.0.0.1", family: 4 }]);
        const result = await checkUrlSafety("http://2130706433/");
        expect(result.ok).toBe(false);
    });
});

describe("checkUrlSafety — allowed destinations", () => {
    it("allows public HTTPS hosts resolving to public IPs", async () => {
        mockDns([{ address: "93.184.216.34", family: 4 }]);
        const result = await checkUrlSafety("https://example.com/");
        expect(result.ok).toBe(true);
    });

    it("allows mixed public answers", async () => {
        mockDns([
            { address: "93.184.216.34", family: 4 },
            { address: "93.184.216.35", family: 4 },
        ]);
        const result = await checkUrlSafety("https://example.com/");
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.ips).toHaveLength(2);
    });

    it("rejects when ANY resolved address is private (first public, second private)", async () => {
        mockDns([
            { address: "93.184.216.34", family: 4 },
            { address: "10.0.0.1", family: 4 },
        ]);
        const result = await checkUrlSafety("https://mixed.example.com/");
        expect(result.ok).toBe(false);
    });
});
