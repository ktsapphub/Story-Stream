-- One table for all collections (users, content, media, knowledge, topics, settings, templates).
-- owner: user id for owner-scoped docs, '' for global docs (users).
-- key: unique lookup key (lower-cased email for users), NULL otherwise.
CREATE TABLE IF NOT EXISTS docs (
  coll TEXT NOT NULL,
  id TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT '',
  key TEXT,
  created_at TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (coll, id)
);

CREATE INDEX IF NOT EXISTS docs_owner ON docs (coll, owner, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS docs_key ON docs (coll, key) WHERE key IS NOT NULL;
