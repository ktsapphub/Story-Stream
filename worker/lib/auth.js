// Email/password auth with HS256 bearer tokens (WebCrypto). Port of backend/auth.py.
// Password hashes: PBKDF2-SHA256 (bcrypt is not available in Workers). Old bcrypt hashes do not verify; users re-register or reset.
import { HttpError } from "./http.js";
import { getDoc } from "./db.js";

const ACCESS_TTL_SECONDS = 7 * 24 * 60 * 60;
// Workers' WebCrypto PBKDF2 maximum.
const PBKDF2_ITERATIONS = 100_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function requireSecret(env) {
  if (!env.JWT_SECRET) throw new HttpError(500, "JWT_SECRET is not configured");
  return env.JWT_SECRET;
}

function hmacKey(env, usages) {
  return crypto.subtle.importKey(
    "raw", enc.encode(requireSecret(env)), { name: "HMAC", hash: "SHA-256" }, false, usages,
  );
}

export async function signToken(env, userId, email) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(enc.encode(JSON.stringify({
    sub: userId, email, type: "access", iat: now, exp: now + ACCESS_TTL_SECONDS,
  })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env, ["sign"]), enc.encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`;
}

// Returns the payload, or null when the token is malformed, forged, expired or not an access token.
export async function verifyToken(env, token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const ok = await crypto.subtle.verify(
    "HMAC", await hmacKey(env, ["verify"]), fromB64url(sig), enc.encode(`${header}.${payload}`),
  );
  if (!ok) return null;
  try {
    const claims = JSON.parse(dec.decode(fromB64url(payload)));
    if (claims.type !== "access" || typeof claims.exp !== "number") return null;
    if (claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iterations, saltB64, hashB64] = (stored || "").split("$");
  if (scheme !== "pbkdf2_sha256" || !iterations || !saltB64 || !hashB64) return false;
  const expected = fromB64(hashB64);
  const actual = await pbkdf2(password, fromB64(saltB64), Number(iterations));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function publicUser(user) {
  const { password_hash: _omit, ...rest } = user;
  return rest;
}

// Auth dependency: returns the public user or throws. 403 for a missing header matches FastAPI's HTTPBearer.
export async function requireUser(request, env) {
  const token = (request.headers.get("authorization") || "").match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new HttpError(403, "Not authenticated");
  const payload = await verifyToken(env, token);
  if (!payload) throw new HttpError(401, "Invalid or expired token");
  const user = await getDoc(env, "users", "", payload.sub);
  if (!user) throw new HttpError(401, "User not found");
  return publicUser(user);
}
