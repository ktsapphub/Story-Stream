// Small shared helpers. Keep this file tiny; add only what two or more modules use.

export const nowIso = () => new Date().toISOString();

export const newId = () => crypto.randomUUID();
