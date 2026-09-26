export const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogv", ".mov", ".m4v"] as const;
export type VideoExtension = (typeof VIDEO_EXTENSIONS)[number];

export const VIDEO_MIME_TYPES: Record<VideoExtension, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
};

const DEFAULT_MAX_UPLOAD_MB = 1024;

/** Per-file upload ceiling. `VIDEMO_MAX_UPLOAD_MB` overrides the 1 GiB default. */
export const MAX_UPLOAD_MB = (() => {
  const raw = Number(process.env.VIDEMO_MAX_UPLOAD_MB);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_MAX_UPLOAD_MB;
  return Math.min(Math.floor(raw), 1024 * 60); // hard ceiling: 60 GB
})();

export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** "1 GB" / "512 MB" / "300 KB" — used in limit error messages. */
export function formatMaxUploadSize(): string {
  if (MAX_UPLOAD_MB >= 1024 && MAX_UPLOAD_MB % 1024 === 0) {
    return `${MAX_UPLOAD_MB / 1024} GB`;
  }
  if (MAX_UPLOAD_MB < 1024) return `${MAX_UPLOAD_MB} MB`;
  return `${(MAX_UPLOAD_MB / 1024).toFixed(1)} GB`;
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function isSupportedExtension(ext: string): ext is VideoExtension {
  return (VIDEO_EXTENSIONS as readonly string[]).includes(ext);
}

/** Strips directory components + anything not URL/file safe. */
export function safeBaseName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "video";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 120) || "video";
}

export function titleFromFilename(filename: string): string {
  return (
    safeBaseName(filename)
      .replace(extensionOf(filename), "")
      .replace(/[._]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Untitled video"
  );
}

/** Human readable label for the 4-second rule / resume prompt. */
export function resumeOffsetLabel(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return `${m}m ${rest}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
