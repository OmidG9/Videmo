import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createVideo } from "@/lib/db/videos";
import { UPLOADS_DIR, THUMBS_DIR } from "@/lib/paths";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { firstError, videoMetaSchema } from "@/lib/validation";
import {
  extensionOf,
  formatMaxUploadSize,
  isSupportedExtension,
  MAX_UPLOAD_BYTES,
  safeBaseName,
  titleFromFilename,
  VIDEO_MIME_TYPES,
} from "@/lib/video-formats";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_THUMB_BYTES = 4 * 1024 * 1024;
const UPLOADS_PER_HOUR = 60;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`upload:${clientIp(request)}`, UPLOADS_PER_HOUR, 60 * 60 * 1000).ok) {
    return NextResponse.json(
      { error: "Upload limit reached. Try again in an hour." },
      { status: 429 },
    );
  }

  // Reject oversized bodies before buffering the whole form in memory.
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES + MAX_THUMB_BYTES) {
    return NextResponse.json(
      { error: `File is larger than the ${formatMaxUploadSize()} limit` },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No video file provided" }, { status: 400 });
  }

  const originalName = safeBaseName(file.name);
  const ext = extensionOf(originalName);

  if (!isSupportedExtension(ext)) {
    return NextResponse.json(
      { error: `Unsupported format "${ext || "unknown"}". Use MP4, WebM, OGV, MOV or M4V.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is larger than the ${formatMaxUploadSize()} limit` },
      { status: 413 },
    );
  }

  const meta = videoMetaSchema.safeParse({
    title: form.get("title") ?? titleFromFilename(originalName),
    description: form.get("description") ?? "",
    duration: form.get("duration") ?? 0,
    width: form.get("width") || undefined,
    height: form.get("height") || undefined,
  });
  if (!meta.success) {
    const { message, field } = firstError(meta.error);
    return NextResponse.json({ error: message, field }, { status: 400 });
  }

  const id = randomUUID();
  // Extension is part of the stored name so the OS/players see a sane file name.
  const storedName = `${id}${VIDEO_MIME_TYPES[ext] ? ext : ".mp4"}`;
  const target = path.join(UPLOADS_DIR, storedName);

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  try {
    await writeFile(target, file);
  } catch (error) {
    console.error("[upload] failed to persist file", error);
    return NextResponse.json({ error: "Failed to save the file" }, { status: 500 });
  }

  const savedThumb = await persistThumbnail(form.get("thumbnail"), id);

  const video = createVideo({
    id,
    ownerId: session.user.id,
    title: meta.data.title,
    description: meta.data.description,
    originalName,
    fileName: storedName,
    mimeType: VIDEO_MIME_TYPES[ext],
    ext,
    sizeBytes: file.size,
    duration: meta.data.duration,
    width: meta.data.width ?? null,
    height: meta.data.height ?? null,
    hasThumbnail: savedThumb,
  });

  return NextResponse.json({ video }, { status: 201 });
}

async function writeFile(target: string, file: File): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.promises.writeFile(target, buffer);
}

/** Stores the browser-generated poster frame. Never throws — it is optional. */
async function persistThumbnail(input: FormDataEntryValue | null, id: string): Promise<boolean> {
  if (typeof input !== "string" || !input.startsWith("data:image/jpeg;base64,")) return false;

  const base64 = input.slice("data:image/jpeg;base64,".length);
  if (base64.length === 0) return false;

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_THUMB_BYTES) return false;
  // JPEG magic bytes — guards against a disguised non-image payload.
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return false;

  fs.mkdirSync(THUMBS_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(THUMBS_DIR, `${id}.jpg`), buffer);
  return true;
}
