import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, 64);
  return {
    salt: salt.toString("base64"),
    hash: Buffer.from(derivedKey).toString("base64"),
  };
}

export async function verifyPassword(password, { salt, hash }) {
  const saltBuf = Buffer.from(salt, "base64");
  const expected = Buffer.from(hash, "base64");
  const derivedKey = await scryptAsync(password, saltBuf, 64);
  return crypto.timingSafeEqual(Buffer.from(derivedKey), expected);
}

