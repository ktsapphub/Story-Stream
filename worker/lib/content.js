// Content doc helpers shared by routes. Port of build_reference_context / make_content_doc.
import { HttpError } from "./http.js";
import { getDoc, listDocs } from "./db.js";
import { nowIso, newId } from "./util.js";

export const REQUIRED = Symbol("required");
export const isStr = (v) => typeof v === "string";
export const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export const nullable = (ok) => (v) => v === null || ok(v);
export const listOf = (ok) => (v) => Array.isArray(v) && v.every(ok);

// Manual stand-in for Pydantic: fields = {name: [check, default | REQUIRED]}. Unknown keys are dropped. 422 on bad input.
export function parseBody(body, fields) {
  const out = {};
  for (const [key, [ok, def]] of Object.entries(fields)) {
    const v = body[key];
    if (v === undefined) {
      if (def === REQUIRED) throw new HttpError(422, `${key} is required`);
      out[key] = structuredClone(def);
    } else if (!ok(v)) {
      throw new HttpError(422, `${key} is invalid`);
    } else out[key] = v;
  }
  return out;
}

export function makeContentDoc(data, ctype, modelKey, owner) {
  const now = nowIso();
  return {
    id: newId(),
    owner,
    type: ctype,
    title: data.title ?? "",
    slug: data.slug ?? "",
    meta_description: data.meta_description ?? "",
    tags: data.tags || [],
    excerpt: data.excerpt ?? "",
    body_markdown: data.body_markdown ?? "",
    image_prompts: data.image_prompts || [],
    header_image: data.header_image ?? null,
    inline_media: data.inline_media || [],
    newsletter: data.newsletter ?? null,
    status: "draft",
    model_used: modelKey,
    quality_score: data.quality_score ?? null,
    source_blog_id: data.source_blog_id ?? null,
    is_deleted: false,
    created_at: now,
    updated_at: now,
  };
}

// Same order as sourceIds; missing, deleted or foreign ids are skipped. Capped at 50 like python.
export async function buildReferenceContext(env, sourceIds, owner) {
  const docs = await Promise.all((sourceIds || []).slice(0, 50).map((id) => getDoc(env, "knowledge", owner, id)));
  return docs
    .filter((d) => d && !d.is_deleted)
    .map((d) => `SOURCE: ${d.title ?? ""}\nSUMMARY: ${d.summary ?? ""}\nCONTENT:\n${(d.content ?? "").slice(0, 3000)}`)
    .join("\n\n---\n\n");
}

// Live (not soft-deleted) docs of one owner/collection, newest first by created_at.
export async function listLive(env, coll, owner, limit) {
  return (await listDocs(env, coll, owner, limit)).filter((d) => !d.is_deleted);
}
