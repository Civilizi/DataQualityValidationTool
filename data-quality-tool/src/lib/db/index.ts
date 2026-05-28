import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { INIT_SQL } from './schema';

let db: Database | null = null;
let dbPromise: Promise<Database> | null = null;

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'dqvt.db');

/** Persist the current database state to disk. */
function save(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Returns the singleton Database instance.
 * On first call it initialises sql.js, optionally loads an existing
 * database file, and runs the schema SQL to guarantee all tables exist.
 */
export async function getDb(): Promise<Database> {
  if (db) return db;
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const SQL = await initSqlJs();

    let loaded = false;
    if (fs.existsSync(DB_PATH)) {
      try {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        loaded = true;
      } catch {
        // Corrupt or unreadable file -- start fresh
        db = new SQL.Database();
      }
    }

    if (!db) {
      db = new SQL.Database();
    }

    // Ensure all tables exist (idempotent)
    db.run(INIT_SQL);
    save();
    return db;
  })();

  return dbPromise!;
}

/** Run a statement that does not return rows (INSERT / UPDATE / DELETE / DDL). */
export async function run(sql: string, params: any[] = []): Promise<{ lastId: number; changes: number }> {
  const database = await getDb();
  database.run(sql, params);
  save();
  const res = database.exec('SELECT last_insert_rowid()');
  return {
    lastId: (res[0]?.values[0][0] as number) ?? 0,
    changes: database.getRowsModified(),
  };
}

/** Run a statement and return all rows. */
export async function all<T = Record<string, unknown>>(
  sql: string,
  params: any[] = [],
): Promise<T[]> {
  const database = await getDb();
  const stmt = database.prepare(sql, params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

/** Run a statement and return the first row (or undefined). */
export async function get<T = Record<string, unknown>>(
  sql: string,
  params: any[] = [],
): Promise<T | undefined> {
  const results = await all<T>(sql, params);
  return results[0];
}

/** Execute a batch of SQL statements (semi-colon separated). */
export async function execute(sql: string): Promise<void> {
  const database = await getDb();
  database.run(sql);
  save();
}
