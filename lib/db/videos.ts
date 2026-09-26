import fs from "node:fs";
import path from "node:path";
import { getDb } from "./index";
import { THUMBS_DIR, UPLOADS_DIR } from "@/lib/paths";
import { isSortOption, type SortOption } from "@/lib/video-sort";

export { SORT_OPTIONS, type SortOption } from "@/lib/video-sort";

export type VideoRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  original_name: string;
  file_name: string;
  mime_type: string;
  ext: string;
  size_bytes: number;
  duration: number;
  width: number | null;
  height: number | null;
  has_thumbnail: number;
  views: number;
  visibility: string;
  created_at: number;
  updated_at: number;
};

export type Video = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  originalName: string;
  ext: string;
  mimeType: string;
  sizeBytes: number;
  duration: number;
  width: number | null;
  height: number | null;
  hasThumbnail: boolean;
  views: number;
  visibility: string;
  createdAt: number;
  updatedAt: number;
};

export type VideoWithProgress = Video & {
  progress: { position: number; completed: boolean; updatedAt: number } | null;
};

function toVideo(row: VideoRow): Video {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    originalName: row.original_name,
    ext: row.ext,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    duration: row.duration,
    width: row.width,
    height: row.height,
    hasThumbnail: row.has_thumbnail === 1,
    views: row.views,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ORDER_BY: Record<SortOption, string> = {
  newest: "v.created_at DESC",
  oldest: "v.created_at ASC",
  title: "v.title COLLATE NOCASE ASC",
  largest: "v.size_bytes DESC",
  longest: "v.duration DESC",
  views: "v.views DESC",
};

export function listVideos(
  ownerId: string,
  options: { search?: string; sort?: SortOption } = {},
): VideoWithProgress[] {
  const sort: SortOption = isSortOption(options.sort) ? options.sort : "newest";
  const term = options.search?.trim() ?? "";

  const rows = getDb()
    .prepare<[string, string, string, string, string], VideoRow & { position: number | null; completed: number | null; progress_updated_at: number | null }>(
      `SELECT v.*, p.position, p.completed, p.updated_at AS progress_updated_at
         FROM videos v
    LEFT JOIN watch_progress p ON p.video_id = v.id AND p.user_id = ?
        WHERE v.owner_id = ?
          AND (? = '' OR v.title LIKE ? ESCAPE '\\' OR v.original_name LIKE ? ESCAPE '\\')
     ORDER BY ${ORDER_BY[sort]}`,
    )
    .all(ownerId, ownerId, term, `%${escapeLike(term)}%`, `%${escapeLike(term)}%`);

  return rows.map((row) => ({
    ...toVideo(row),
    progress:
      row.position === null
        ? null
        : {
            position: row.position,
            completed: row.completed === 1,
            updatedAt: row.progress_updated_at ?? row.updated_at,
          },
  }));
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function getVideo(id: string, ownerId?: string): Video | undefined {
  const row = ownerId
    ? getDb()
        .prepare<[string, string], VideoRow>(
          "SELECT * FROM videos WHERE id = ? AND owner_id = ?",
        )
        .get(id, ownerId)
    : getDb().prepare<[string], VideoRow>("SELECT * FROM videos WHERE id = ?").get(id);
  return row ? toVideo(row) : undefined;
}

export function createVideo(input: {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  ext: string;
  sizeBytes: number;
  duration?: number;
  width?: number | null;
  height?: number | null;
  hasThumbnail?: boolean;
}): Video {
  const now = Date.now();
  const row: VideoRow = {
    id: input.id,
    owner_id: input.ownerId,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    original_name: input.originalName,
    file_name: input.fileName,
    mime_type: input.mimeType,
    ext: input.ext,
    size_bytes: input.sizeBytes,
    duration: input.duration ?? 0,
    width: input.width ?? null,
    height: input.height ?? null,
    has_thumbnail: input.hasThumbnail ? 1 : 0,
    views: 0,
    visibility: "private",
    created_at: now,
    updated_at: now,
  };

  getDb()
    .prepare(
      `INSERT INTO videos
        (id, owner_id, title, description, original_name, file_name, mime_type,
         ext, size_bytes, duration, width, height, has_thumbnail, views,
         visibility, created_at, updated_at)
       VALUES
        (@id, @owner_id, @title, @description, @original_name, @file_name, @mime_type,
         @ext, @size_bytes, @duration, @width, @height, @has_thumbnail, @views,
         @visibility, @created_at, @updated_at)`,
    )
    .run(row);

  return toVideo(row);
}

export function updateVideo(
  id: string,
  ownerId: string,
  patch: { title?: string; description?: string },
): Video | undefined {
  const current = getVideo(id, ownerId);
  if (!current) return undefined;

  getDb()
    .prepare(
      `UPDATE videos
          SET title = ?, description = ?, updated_at = ?
        WHERE id = ? AND owner_id = ?`,
    )
    .run(
      patch.title?.trim() ?? current.title,
      patch.description?.trim() ?? current.description,
      Date.now(),
      id,
      ownerId,
    );

  return getVideo(id, ownerId);
}

export function deleteVideo(id: string, ownerId: string): Video | undefined {
  const video = getVideo(id, ownerId);
  if (!video) return undefined;
  getDb().prepare("DELETE FROM videos WHERE id = ? AND owner_id = ?").run(id, ownerId);
  return video;
}

export function incrementViews(id: string): void {
  getDb().prepare("UPDATE videos SET views = views + 1 WHERE id = ?").run(id);
}

export function hasThumbnailFile(id: string): boolean {
  return fs.existsSync(path.join(THUMBS_DIR, `${id}.jpg`));
}

/** Absolute path of the stored media file (`<uuid><ext>`), or null if gone. */
export function resolveVideoFilePath(video: Video): string | null {
  const withExt = path.join(UPLOADS_DIR, `${video.id}${video.ext}`);
  if (fs.existsSync(withExt)) return withExt;
  const legacy = path.join(UPLOADS_DIR, video.id);
  return fs.existsSync(legacy) ? legacy : null;
}

export function thumbnailFilePath(id: string): string {
  return path.join(THUMBS_DIR, `${id}.jpg`);
}
