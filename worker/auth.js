// Email/password auth with HS256 bearer tokens (WebCrypto only, no dependencies).
import { ApiError } from "./http.js";
import * as db from "./db.js";

const TTL_SECONDS = 7 * 24 * 3600;
const ITERATIONS = 100_000; // Workers' PBKDF2 maximum
const enc = new TextEncoder();

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

const hmacKey = (secret, usage) => crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);

function secretOf(env) {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) throw new ApiError(503, "not_configured", "Server auth is not configured (JWT_SECRET)");
  return env.JWT_SECRET;
}

export async function createToken(env, userId, email) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(enc.encode(JSON.stringify({ sub: userId, email, type: "access", iat: now, exp: now + TTL_SECONDS })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secretOf(env), "sign"), enc.encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

export async function decodeToken(env, token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secretOf(env), "verify"), unb64url(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64url(parts[1])));
    return p.type === "access" && p.exp > Date.now() / 1000 ? p : null;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return null;
  }
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64url(salt)}$${b64url(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, salt, hash] = String(stored).split("$");
  if (scheme !== "pbkdf2") return false;
  const got = new Uint8Array(await derive(password, unb64url(salt), Number(iter)));
  const want = unb64url(hash);
  let diff = got.length ^ want.length;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ (want[i] ?? 0);
  return diff === 0;
}

// Resolves the bearer token to a public user, or throws 401.
export async function currentUser(env, request) {
  const m = (request.headers.get("authorization") || "").match(/^Bearer (.+)$/i);
  if (!m) throw new ApiError(401, "unauthorized", "Not authenticated");
  const payload = await decodeToken(env, m[1]);
  if (!payload) throw new ApiError(401, "unauthorized", "Invalid or expired token");
  const u = await db.userById(env.DB, payload.sub);
  if (!u) throw new ApiError(401, "unauthorized", "User not found");
  return db.publicUser(u);
}

// Optional admin seed from secrets (no built-in default credentials).
export async function seedAdmin(env) {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await db.userByEmail(env.DB, email);
  if (!existing) {
    await db.createUser(env.DB, {
      id: crypto.randomUUID(), email, password_hash: await hashPassword(env.ADMIN_PASSWORD),
      name: "Story Stream", role: "admin", created_at: new Date().toISOString(),
    });
  }
}
