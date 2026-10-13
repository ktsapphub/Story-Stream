// D1 access. Documents (content, media, knowledge, ...) live in one `docs` table as JSON,
// mirroring the old MongoDB collections; users get their own table for the unique email.
// shortcut: list queries filter/sort in JS after an owner-scoped read capped at LIMIT rows; move to
// indexed columns if a single user ever holds more than a few thousand documents.
const LIMIT = 1000;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT, role TEXT, created_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS docs (coll TEXT NOT NULL, id TEXT NOT NULL, owner TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, PRIMARY KEY (coll, id))`,
  `CREATE INDEX IF NOT EXISTS docs_owner ON docs (coll, owner, deleted)`,
];

let ready;
export function ensureSchema(db) {
  ready ??= db.batch(SCHEMA.map((s) => db.prepare(s))).catch((e) => { ready = undefined; throw e; });
  return ready;
}

const parse = (r) => (r ? JSON.parse(r.data) : null);

export async function insert(db, coll, doc) {
  await db.prepare("INSERT INTO docs (coll, id, owner, deleted, data) VALUES (?, ?, ?, ?, ?)")
    .bind(coll, doc.id, doc.owner, doc.is_deleted ? 1 : 0, JSON.stringify(doc)).run();
  return doc;
}

export async function save(db, coll, doc) {
  await db.prepare("UPDATE docs SET deleted = ?, data = ? WHERE coll = ? AND id = ? AND owner = ?")
    .bind(doc.is_deleted ? 1 : 0, JSON.stringify(doc), coll, doc.id, doc.owner).run();
  return doc;
}

export async function upsert(db, coll, doc) {
  await db.prepare(
    "INSERT INTO docs (coll, id, owner, deleted, data) VALUES (?, ?, ?, 0, ?) ON CONFLICT (coll, id) DO UPDATE SET data = excluded.data",
  ).bind(coll, doc.id, doc.owner, JSON.stringify(doc)).run();
  return doc;
}

export async function remove(db, coll, id, owner) {
  await db.prepare("DELETE FROM docs WHERE coll = ? AND id = ? AND owner = ?").bind(coll, id, owner).run();
}

// Owner-scoped fetch by id (soft-deleted docs are still returned, like the old API).
export async function get(db, coll, id, owner) {
  return parse(await db.prepare("SELECT data FROM docs WHERE coll = ? AND id = ? AND owner = ?").bind(coll, id, owner).first());
}

// Soft-deleted rows excluded. Optional predicate and sort (key, dir) applied in JS.
export async function list(db, coll, owner, { where, sortBy, desc = false, limit = LIMIT } = {}) {
  const { results } = await db.prepare("SELECT data FROM docs WHERE coll = ? AND owner = ? AND deleted = 0 LIMIT ?").bind(coll, owner, LIMIT).all();
  let rows = results.map(parse);
  if (where) rows = rows.filter(where);
  if (sortBy) {
    const key = (r) => String(r[sortBy] ?? "").toLowerCase();
    rows.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (desc ? -1 : 1));
  }
  return rows.slice(0, limit);
}

export async function softDelete(db, coll, id, owner) {
  const doc = await get(db, coll, id, owner);
  if (doc) await save(db, coll, { ...doc, is_deleted: true });
}

export async function patch(db, coll, id, owner, fields) {
  const doc = await get(db, coll, id, owner);
  return doc ? save(db, coll, { ...doc, ...fields }) : null;
}

// ---- users ----
export const userByEmail = (db, email) => db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
export const userById = (db, id) => db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
export const createUser = (db, u) =>
  db.prepare("INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(u.id, u.email, u.password_hash, u.name, u.role, u.created_at).run();
export const setPasswordHash = (db, id, hash) => db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, id).run();

export function publicUser(u) {
  if (!u) return u;
  const { password_hash, ...rest } = u; // eslint-disable-line no-unused-vars
  return rest;
}
