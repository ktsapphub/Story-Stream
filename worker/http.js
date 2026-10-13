// Shared HTTP helpers: JSON responses, consistent errors, request validation.

export class ApiError extends Error {
  constructor(status, code, detail) {
    super(detail);
    this.status = status;
    this.code = code;
  }
}

export const bad = (detail) => new ApiError(400, "bad_request", detail);
export const notFound = (detail) => new ApiError(404, "not_found", detail);
export const upstream = (detail) => new ApiError(502, "upstream_error", detail);

const SECURITY_HEADERS = { "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" };

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...SECURITY_HEADERS } });

export const errorResponse = (e) => json({ detail: e.message, code: e.code }, e.status);

export const nowIso = () => new Date().toISOString();
export const uuid = () => crypto.randomUUID();

export async function readJson(request, maxBytes = 1_000_000) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > maxBytes) throw new ApiError(413, "payload_too_large", "Request body too large");
  const text = await request.text();
  if (text.length > maxBytes) throw new ApiError(413, "payload_too_large", "Request body too large");
  if (!text.trim()) return {};
  try {
    const v = JSON.parse(text);
    if (v === null || typeof v !== "object" || Array.isArray(v)) throw new Error();
    return v;
  } catch {
    throw new ApiError(422, "validation_error", "Request body must be a JSON object");
  }
}

const invalid = (field, msg) => new ApiError(422, "validation_error", `${field}: ${msg}`);

// Field specs: "str" | "str?" | "str=default" | "bool" | "int" | "strs" | "objs" | "obj" | "any",
// a trailing "?" means optional (undefined/null allowed). Returns a new object with defaults applied.
// opts: {max: n} string/array length cap, {min: n} for ints/min string length.
export function validate(body, schema) {
  const out = {};
  for (const [field, spec] of Object.entries(schema)) {
    const { type, optional, def, max = 20000, min = 0, lo, hi } = typeof spec === "string" ? { type: spec } : spec;
    let v = body[field];
    if (v === undefined || v === null) {
      if (def !== undefined) { out[field] = def; continue; }
      if (optional) { out[field] = null; continue; }
      throw invalid(field, "Field required");
    }
    switch (type) {
      case "str":
        if (typeof v !== "string") throw invalid(field, "Input should be a valid string");
        if (v.length > max) throw invalid(field, `Input should have at most ${max} characters`);
        if (v.length < min) throw invalid(field, `Input should have at least ${min} characters`);
        break;
      case "bool":
        if (typeof v !== "boolean") throw invalid(field, "Input should be a valid boolean");
        break;
      case "int":
        if (!Number.isInteger(v)) throw invalid(field, "Input should be a valid integer");
        if ((lo !== undefined && v < lo) || (hi !== undefined && v > hi)) throw invalid(field, "Input out of range");
        break;
      case "strs":
        if (!Array.isArray(v) || v.length > 200 || v.some((x) => typeof x !== "string" || x.length > max)) throw invalid(field, "Input should be a list of strings");
        break;
      case "objs":
        if (!Array.isArray(v) || v.length > 200 || v.some((x) => !x || typeof x !== "object" || Array.isArray(x))) throw invalid(field, "Input should be a list of objects");
        break;
      case "obj":
        if (typeof v !== "object" || Array.isArray(v)) throw invalid(field, "Input should be an object");
        break;
      default:
        break;
    }
    out[field] = v;
  }
  return out;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Query-string helper: validated integer with bounds.
export function intParam(url, name, def, lo, hi) {
  const raw = url.searchParams.get(name);
  if (raw === null) return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < lo || n > hi) throw invalid(name, `Input should be an integer between ${lo} and ${hi}`);
  return n;
}

// Reject non-http(s) and obviously internal targets before fetching a user-supplied URL.
export function assertPublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw bad("Invalid URL"); }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw bad("Only http(s) URLs are allowed");
  const h = u.hostname.toLowerCase();
  const v4 = h.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  const internal =
    h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.includes(":") ||
    (v4 && (v4[1] === "10" || v4[1] === "127" || v4[1] === "0" || (v4[1] === "169" && v4[2] === "254") ||
      (v4[1] === "172" && +v4[2] >= 16 && +v4[2] <= 31) || (v4[1] === "192" && v4[2] === "168")));
  if (internal) throw bad("URL host is not allowed");
  return u;
}
