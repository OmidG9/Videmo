import fs from "node:fs";
import path from "node:path";

/**
 * All mutable runtime state lives in a single, git-ignored `data/` directory
 * so the app runs with zero external services. Override with Videmo_DATA_DIR.
 */
export const PROJECT_ROOT = process.cwd();

export const DATA_DIR =
  process.env.VIDEMO_DATA_DIR ?? path.join(PROJECT_ROOT, "data");

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const THUMBS_DIR = path.join(DATA_DIR, "thumbs");
export const DB_FILE = path.join(DATA_DIR, "videmo.db");

export function ensureStorageDirs(): void {
  for (const dir of [DATA_DIR, UPLOADS_DIR, THUMBS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
