import { getDb } from "./index";

export type ProgressRow = {
  user_id: string;
  video_id: string;
  position: number;
  duration: number;
  completed: number;
  updated_at: number;
};

export type Progress = {
  videoId: string;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: number;
};

function toProgress(row: ProgressRow): Progress {
  return {
    videoId: row.video_id,
    position: row.position,
    duration: row.duration,
    completed: row.completed === 1,
    updatedAt: row.updated_at,
  };
}

export function getProgress(userId: string, videoId: string): Progress | undefined {
  const row = getDb()
    .prepare<[string, string], ProgressRow>(
      "SELECT * FROM watch_progress WHERE user_id = ? AND video_id = ?",
    )
    .get(userId, videoId);
  return row ? toProgress(row) : undefined;
}

export function saveProgress(input: {
  userId: string;
  videoId: string;
  position: number;
  duration: number;
}): Progress {
  // A video counts as watched once the viewer is past 92% of it.
  const completed =
    input.duration > 0 && input.position / input.duration >= 0.92 ? 1 : 0;
  const now = Date.now();

  getDb()
    .prepare(
      `INSERT INTO watch_progress (user_id, video_id, position, duration, completed, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, video_id) DO UPDATE SET
         position   = excluded.position,
         duration   = excluded.duration,
         completed  = excluded.completed,
         updated_at = excluded.updated_at`,
    )
    .run(input.userId, input.videoId, Math.max(0, input.position), input.duration, completed, now);

  return { videoId: input.videoId, position: input.position, duration: input.duration, completed: completed === 1, updatedAt: now };
}

export function listRecentProgress(userId: string, limit = 12): (Progress & { title: string; has_thumbnail: number })[] {
  return getDb()
    .prepare<[string, number], ProgressRow & { title: string; has_thumbnail: number }>(
      `SELECT p.*, v.title, v.has_thumbnail
         FROM watch_progress p
         JOIN videos v ON v.id = p.video_id
        WHERE p.user_id = ? AND p.position > 0
        ORDER BY p.updated_at DESC
        LIMIT ?`,
    )
    .all(userId, limit)
    .map((row) => ({
      videoId: row.video_id,
      position: row.position,
      duration: row.duration,
      completed: row.completed === 1,
      updatedAt: row.updated_at,
      title: row.title,
      has_thumbnail: row.has_thumbnail,
    }));
}

export function totalWatchSeconds(userId: string): number {
  const row = getDb()
    .prepare<[string], { total: number | null }>(
      "SELECT SUM(COALESCE(duration, 0)) AS total FROM watch_progress WHERE user_id = ? AND completed = 1",
    )
    .get(userId);
  return Math.round(row?.total ?? 0);
}
