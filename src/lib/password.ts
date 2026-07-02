// Password hashing, dependency-free.
//
// Uses Node's built-in scrypt — a deliberately slow, memory-hard KDF designed
// for passwords. We store "salt:derivedKey" (both hex); the raw password is
// never persisted. Verification is constant-time to avoid timing attacks.
//
// This module has NO framework imports, so it can be used from both the app
// and the standalone seed script (run via tsx).

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64; // bytes of derived key

/** Hash a plaintext password into a storable "salt:key" string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

/**
 * Verify a plaintext password against a stored "salt:key" hash. Returns false
 * (rather than throwing) on any malformed input, so callers can treat it as a
 * plain boolean.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;

  const storedKey = Buffer.from(keyHex, "hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  // Lengths must match for timingSafeEqual; guard to avoid a throw.
  if (storedKey.length !== derived.length) return false;
  return timingSafeEqual(storedKey, derived);
}
