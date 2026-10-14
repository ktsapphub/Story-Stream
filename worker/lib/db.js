// Document store on one D1 table (see migrations/0001_init.sql). Mirrors the old Mongo
// collections: each row keeps the full doc as JSON in `data`. Owner-scoped reads.
// shortcut: other filters run in JS over owner-scoped rows, capped by `limit`; add json_extract indexes when a collection grows past a few thousand rows.

const DEFAULT_LIMIT = 500;

export async function getDoc(env, coll, owner, id) {
  const row = await env.DB.prepare(
    "SELECT data FROM docs WHERE coll = ? AND owner = ? AND id = ?",
  ).bind(coll, owner, id).first();
  return row ? JSON.parse(row.data) : null;
}

export async function findByKey(env, coll, key) {
  const row = await env.DB.prepare(
    "SELECT data FROM docs WHERE coll = ? AND key = ?",
  ).bind(coll, key).first();
  return row ? JSON.parse(row.data) : null;
}

export async function listDocs(env, coll, owner, limit = DEFAULT_LIMIT) {
  const { results } = await env.DB.prepare(
    "SELECT data FROM docs WHERE coll = ? AND owner = ? ORDER BY created_at DESC LIMIT ?",
  ).bind(coll, owner, limit).all();
  return results.map((row) => JSON.parse(row.data));
}

export async function insertDoc(env, coll, owner, doc, key = null) {
  await env.DB.prepare(
    "INSERT INTO docs (id, coll, owner, key, created_at, data) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(doc.id, coll, owner, key, doc.created_at, JSON.stringify(doc)).run();
  return doc;
}

export async function updateDoc(env, coll, owner, id, doc) {
  const res = await env.DB.prepare(
    "UPDATE docs SET data = ? WHERE coll = ? AND owner = ? AND id = ?",
  ).bind(JSON.stringify(doc), coll, owner, id).run();
  return res.meta.changes > 0;
}

export async function deleteDoc(env, coll, owner, id) {
  const res = await env.DB.prepare(
    "DELETE FROM docs WHERE coll = ? AND owner = ? AND id = ?",
  ).bind(coll, owner, id).run();
  return res.meta.changes > 0;
}
