import fs from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getVerifiedUser, UNAUTHORIZED } from "@/lib/auth/session";
import { getVideo, resolveVideoFilePath } from "@/lib/db/videos";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const DENIED = () => NextResponse.json(UNAUTHORIZED, { status: 401 });

/**
 * Serves the video file itself with byte-range support so the player can seek,
 * buffer and resume without downloading the whole file.
 */
async function handle(
  request: Request,
  { params }: Params,
  withBody: boolean,
): Promise<Response> {
  const user = await getVerifiedUser();
  if (!user) return DENIED();

  const { id } = await params;
  const video = getVideo(id, user.id);
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  const filePath = resolveVideoFilePath(video);
  if (!filePath) {
    return NextResponse.json({ error: "Video file is missing" }, { status: 410 });
  }

  let size: number;
  try {
    size = fs.statSync(filePath).size;
  } catch {
    return NextResponse.json({ error: "Video file is missing" }, { status: 410 });
  }

  const baseHeaders: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Content-Type": video.mimeType,
    "Cache-Control": "private, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  };

  const range = request.headers.get("range");

  if (!range) {
    const headers = { ...baseHeaders, "Content-Length": String(size) };
    if (!withBody) return new Response(null, { status: 200, headers });
    const stream = Readable.toWeb(fs.createReadStream(filePath));
    return new Response(stream as ReadableStream, { status: 200, headers });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match || (match[1] === "" && match[2] === "")) {
    return new Response(null, {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
    });
  }

  let start: number;
  let end: number;

  if (match[1] === "") {
    // Suffix range: "bytes=-500" means the final 500 bytes.
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
      });
    }
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Number(match[2]);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
    return new Response(null, {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
    });
  }
  end = Math.min(end, size - 1);

  const headers = {
    ...baseHeaders,
    "Content-Range": `bytes ${start}-${end}/${size}`,
    "Content-Length": String(end - start + 1),
  };

  if (!withBody) return new Response(null, { status: 206, headers });

  const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end }));
  return new Response(stream as ReadableStream, { status: 206, headers });
}

export async function GET(request: Request, context: Params) {
  return handle(request, context, true);
}

export async function HEAD(request: Request, context: Params) {
  return handle(request, context, false);
}
