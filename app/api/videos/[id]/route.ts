import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getVerifiedUser, UNAUTHORIZED } from "@/lib/auth/session";
import { deleteVideo, resolveVideoFilePath, thumbnailFilePath, updateVideo } from "@/lib/db/videos";
import { firstError } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140).optional(),
  description: z.string().trim().max(2000).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const user = await getVerifiedUser();
  if (!user) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  const { id } = await params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    const { message, field } = firstError(parsed.error);
    return NextResponse.json({ error: message, field }, { status: 400 });
  }

  const video = updateVideo(id, user.id, parsed.data);
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  return NextResponse.json({ video });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getVerifiedUser();
  if (!user) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  const { id } = await params;
  const video = deleteVideo(id, user.id);
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  // Row is gone; clean up the blobs. Failures are logged, never surfaced —
  // a leftover file is preferable to a failed delete the UI reports as broken.
  const mediaPath = resolveVideoFilePath(video);
  await Promise.all([
    mediaPath ? fs.unlink(mediaPath).catch(() => {}) : Promise.resolve(),
    fs.unlink(thumbnailFilePath(id)).catch(() => {}),
  ]);

  return new NextResponse(null, { status: 204 });
}
