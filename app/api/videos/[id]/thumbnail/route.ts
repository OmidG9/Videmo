import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getVerifiedUser, UNAUTHORIZED } from "@/lib/auth/session";
import { getVideo, thumbnailFilePath } from "@/lib/db/videos";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getVerifiedUser();
  if (!user) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  const { id } = await params;
  const video = getVideo(id, user.id);
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  try {
    const buffer = await fs.readFile(thumbnailFilePath(id));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "No thumbnail" }, { status: 404 });
  }
}
