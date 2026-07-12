import crypto from "node:crypto";
import { config } from "./config.js";

/* AES-256-GCM for refresh tokens at rest + HMAC signing for the session cookie.
   TOKEN_ENCRYPTION_KEY must be base64 of exactly 32 bytes (e.g.
   `openssl rand -base64 32`). Refresh tokens are the crown jewels — they never
   reach the browser and are only ever stored encrypted. */

function key(): Buffer {
  const b = Buffer.from(config.tokenKey, "base64");
  if (b.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be base64 of 32 bytes");
  return b;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64")).join(".");
}

export function decrypt(blob: string): string {
  const [ivB, tagB, encB] = blob.split(".");
  if (!ivB || !tagB || !encB) throw new Error("malformed ciphertext");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encB, "base64")), decipher.final()]).toString("utf8");
}

/** Sign `value` → `value.hmac`. Used for the session cookie and OAuth state. */
export function sign(value: string): string {
  const mac = crypto.createHmac("sha256", config.sessionSecret).update(value).digest("base64url");
  return `${value}.${mac}`;
}

/** Verify and strip the signature; returns null if tampered. */
export function unsign(signed: string): string | null {
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const expected = sign(value);
  const a = Buffer.from(signed);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? value : null;
}

export const randomId = (bytes = 18) => crypto.randomBytes(bytes).toString("base64url");
