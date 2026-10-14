// Atrapa bazy Cloudflare D1 na wbudowanym SQLite z Node (node:sqlite) — tylko do testów.
// Udostępnia ten sam podzbiór API co D1: prepare().bind().run() / .all() / .first().
export async function createTestD1() {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');
  const statement = (sql, args = []) => ({
    bind: (...a) => statement(sql, a),
    run: async () => {
      db.prepare(sql).run(...args);
      return { success: true };
    },
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    first: async () => db.prepare(sql).get(...args) ?? null,
  });
  return { prepare: (sql) => statement(sql), _raw: db };
}
