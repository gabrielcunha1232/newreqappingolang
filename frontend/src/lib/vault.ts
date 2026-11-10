export const VAULT_ITERATIONS = 600_000;
const PROBE = 'forkarsenet-vault';

export interface EncryptedBlob {
  iv: string;
  data: string;
}

export interface EncryptedVault extends EncryptedBlob {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
}

export interface VaultSession {
  key: CryptoKey;
  salt: string;
  iterations: number;
  probe: EncryptedBlob;
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Senha incorreta.');
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: string, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(key: CryptoKey, text: string): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

async function decrypt(key: CryptoKey, blob: EncryptedBlob): Promise<string> {
  try {
    const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(blob.iv) }, key, fromBase64(blob.data));
    return new TextDecoder().decode(data);
  } catch {
    throw new WrongPasswordError();
  }
}

async function sessionFor(password: string, salt: string, iterations: number): Promise<VaultSession> {
  const key = await deriveKey(password, salt, iterations);
  return { key, salt, iterations, probe: await encrypt(key, PROBE) };
}

export async function createVaultSession(password: string, iterations = VAULT_ITERATIONS): Promise<VaultSession> {
  return sessionFor(password, toBase64(crypto.getRandomValues(new Uint8Array(16))), iterations);
}

export async function verifyPassword(session: VaultSession, password: string): Promise<boolean> {
  const key = await deriveKey(password, session.salt, session.iterations);
  try {
    return (await decrypt(key, session.probe)) === PROBE;
  } catch {
    return false;
  }
}

export async function sealSecrets(session: VaultSession, secrets: Record<string, string>): Promise<EncryptedVault> {
  const blob = await encrypt(session.key, JSON.stringify(secrets));
  return { v: 1, kdf: 'PBKDF2-SHA256', iterations: session.iterations, salt: session.salt, ...blob };
}

export async function openVault(
  vault: EncryptedVault,
  password: string
): Promise<{ secrets: Record<string, string>; session: VaultSession }> {
  const session = await sessionFor(password, vault.salt, vault.iterations);
  const parsed: unknown = JSON.parse(await decrypt(session.key, vault));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new WrongPasswordError();
  const secrets = Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
  return { secrets, session };
}

export function isEncryptedVault(value: unknown): value is EncryptedVault {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.v === 1 &&
    typeof v.salt === 'string' &&
    typeof v.iv === 'string' &&
    typeof v.data === 'string' &&
    typeof v.iterations === 'number' &&
    v.iterations > 0
  );
}
