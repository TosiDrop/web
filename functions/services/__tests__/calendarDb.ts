import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function calendarDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE projects (id TEXT PRIMARY KEY, network TEXT, owner_address TEXT, status TEXT, name TEXT, token_id TEXT);`);
  sqlite.exec(readFileSync('migrations/0011_reward_calendar.sql', 'utf8'));
  const prepare = (query: string) => {
    let values: (string | number | null)[] = [];
    const statement = {
      bind: (...args: (string | number | null)[]) => { values = args; return statement; },
      first: async () => sqlite.prepare(query).get(...values) ?? null,
      all: async () => ({ results: sqlite.prepare(query).all(...values), success: true }),
      run: async () => { const result = sqlite.prepare(query).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
    };
    return statement;
  };
  const batch = async (statements: ReturnType<typeof prepare>[]) => {
    sqlite.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  };
  return { db: {prepare,batch} as unknown as D1Database, sqlite };
}
