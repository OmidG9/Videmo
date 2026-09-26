import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DB_FILE, UPLOADS_DIR, THUMBS_DIR } from "@/lib/paths";
import { runMigrations } from "./schema";

declare global {
  var __videmoDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(THUMBS_DIR, { recursive: true });

  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  runMigrations(db);
  return db;
}

/**
 * Cached on globalThis so Next's dev-mode module reloading does not leak
 * file handles (the classic "database is locked" / too-many-open-files bug).
 */
export function getDb(): Database.Database {
  if (!globalThis.__videmoDb) {
    globalThis.__videmoDb = createConnection();
  }
  return globalThis.__videmoDb;
}
