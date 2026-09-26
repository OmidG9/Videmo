import type { Database } from "better-sqlite3";

/**
 * Forward-only, idempotent migrations.
 * Never edit an applied migration — append a new one.
 */
export type Migration = {
  id: string;
  up: (db: Database) => void;
};

export const migrations: Migration[] = [
  {
    id: "001_init",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id             TEXT    PRIMARY KEY,
          email          TEXT    NOT NULL,
          name           TEXT    NOT NULL,
          password_hash  TEXT    NOT NULL,
          created_at     INTEGER NOT NULL,
          updated_at     INTEGER NOT NULL,
          last_login_at  INTEGER
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase
          ON users (email COLLATE NOCASE);

        CREATE TABLE IF NOT EXISTS videos (
          id             TEXT    PRIMARY KEY,
          owner_id       TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title          TEXT    NOT NULL,
          description    TEXT    NOT NULL DEFAULT '',
          original_name  TEXT    NOT NULL,
          file_name      TEXT    NOT NULL,
          mime_type      TEXT    NOT NULL,
          ext            TEXT    NOT NULL,
          size_bytes     INTEGER NOT NULL DEFAULT 0,
          duration       REAL    NOT NULL DEFAULT 0,
          width          INTEGER,
          height         INTEGER,
          has_thumbnail  INTEGER NOT NULL DEFAULT 0,
          views          INTEGER NOT NULL DEFAULT 0,
          visibility     TEXT    NOT NULL DEFAULT 'private',
          created_at     INTEGER NOT NULL,
          updated_at     INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_videos_owner_created
          ON videos (owner_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_videos_title_nocase
          ON videos (title COLLATE NOCASE);

        CREATE TABLE IF NOT EXISTS watch_progress (
          user_id    TEXT    NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
          video_id   TEXT    NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
          position   REAL    NOT NULL DEFAULT 0,
          duration   REAL    NOT NULL DEFAULT 0,
          completed  INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (user_id, video_id)
        );
        CREATE INDEX IF NOT EXISTS idx_progress_user_updated
          ON watch_progress (user_id, updated_at DESC);
      `);
    },
  },
];

export function runMigrations(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    db
      .prepare<[], { id: string }>("SELECT id FROM _migrations")
      .all()
      .map((row) => row.id),
  );

  const record = db.prepare(
    "INSERT INTO _migrations (id, applied_at) VALUES (?, ?)",
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    db.transaction(() => {
      migration.up(db);
      record.run(migration.id, Date.now());
    })();
  }
}
