import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Workspace-scoped credential storage.
 *
 * Credentials are encrypted with AES-256-GCM (authenticated encryption) under
 * CREDENTIALS_ENCRYPTION_KEY, a 32-byte key supplied via the environment —
 * never stored in the database. Nodes reference credentials by id;
 * decrypted secrets exist only inside server-side executors at run time.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

export function getEncryptionKey(): Buffer {
    if (cachedKey) return cachedKey;
    const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
    if (!raw) {
        throw new Error(
            "CREDENTIALS_ENCRYPTION_KEY is not set — generate one with `openssl rand -hex 32` and add it to .env."
        );
    }
    // Accept hex (64 chars) or base64; fall back to hashing a passphrase.
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
        cachedKey = Buffer.from(raw, "hex");
        return cachedKey;
    }
    const asBase64 = Buffer.from(raw, "base64");
    if (asBase64.length === 32 && asBase64.toString("base64") === raw) {
        cachedKey = asBase64;
        return cachedKey;
    }
    cachedKey = crypto.createHash("sha256").update(String(raw), "utf8").digest();
    return cachedKey;
}

export type CredentialPayload = Record<string, string>;

export function encryptCredential(payload: CredentialPayload): Buffer {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Layout: iv || tag || ciphertext
    return Buffer.concat([iv, tag, ciphertext]);
}

export function decryptCredential(blob: Buffer): CredentialPayload {
    const key = getEncryptionKey();
    if (blob.length < IV_LEN + TAG_LEN + 1) {
        throw new Error("Stored credential is malformed.");
    }
    const iv = blob.subarray(0, IV_LEN);
    const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = blob.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(plaintext.toString("utf8")) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Stored credential does not contain an object payload.");
    }
    return parsed as CredentialPayload;
}

export type CredentialSummary = {
    id: string;
    name: string;
    provider: string;
    createdAt: Date;
    updatedAt: Date;
};

/** List a user's credentials — metadata only, never the secret material. */
export async function listCredentials(userId: string): Promise<CredentialSummary[]> {
    return prisma.credential.findMany({
        where: { userId },
        select: { id: true, name: true, provider: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: "desc" },
    });
}

export async function createCredential(
    userId: string,
    name: string,
    provider: string,
    payload: CredentialPayload,
): Promise<CredentialSummary> {
    const credential = await prisma.credential.create({
        data: { userId, name: name.trim(), provider, encryptedData: new Uint8Array(encryptCredential(payload)) },
        select: { id: true, name: true, provider: true, createdAt: true, updatedAt: true },
    });
    return credential;
}

export async function updateCredential(
    userId: string,
    id: string,
    input: { name?: string; provider?: string; payload?: CredentialPayload },
): Promise<CredentialSummary | null> {
    const existing = await prisma.credential.findFirst({ where: { id, userId } });
    if (!existing) return null;
    const credential = await prisma.credential.update({
        where: { id: existing.id },
        data: {
            name: input.name?.trim() ?? existing.name,
            provider: input.provider ?? existing.provider,
            encryptedData: input.payload ? new Uint8Array(encryptCredential(input.payload)) : existing.encryptedData,
        },
        select: { id: true, name: true, provider: true, createdAt: true, updatedAt: true },
    });
    return credential;
}

export async function deleteCredential(userId: string, id: string): Promise<boolean> {
    const deleted = await prisma.credential.deleteMany({ where: { id, userId } });
    return deleted.count > 0;
}

/**
 * Decrypt a credential for a server-side executor. Ownership is enforced here
 * — a credential can only be resolved by the user who owns it. Callers must
 * never forward the result to a client.
 */
export async function resolveCredential(
    userId: string,
    credentialId: string,
): Promise<CredentialPayload> {
    const credential = await prisma.credential.findFirst({ where: { id: credentialId, userId } });
    if (!credential) {
        throw new Error(`Credential not found for this workspace (${credentialId}).`);
    }
    return decryptCredential(Buffer.from(credential.encryptedData));
}

/**
 * Resolve a config field that can be either a raw literal (legacy, redacted
 * from retrieval) or a `credentialId` reference. Returns the raw value when
 * no credential is referenced — never throws on missing raw values.
 */
export async function resolveConfigSecret(
    userId: string,
    config: Record<string, unknown>,
    field: string,
): Promise<string> {
    const credentialId = typeof config.credentialId === "string" ? config.credentialId.trim() : "";
    if (credentialId) {
        const payload = await resolveCredential(userId, credentialId);
        const value = payload[field] ?? payload.apiKey ?? payload.token ?? payload.secret ?? payload.password;
        if (typeof value === "string" && value.trim()) return value.trim();
        throw new Error(`Credential "${credentialId}" does not contain a "${field}" value.`);
    }
    const raw = config[field];
    return typeof raw === "string" ? raw.trim() : "";
}
