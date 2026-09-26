import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getVideo } from "@/lib/db/videos";
import { getProgress, saveProgress } from "@/lib/db/progress";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { firstError, progressSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const WRITES_PER_MINUTE = 120;

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!getVideo(id, session.user.id)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const progress = getProgress(session.user.id, id);
  return NextResponse.json({ progress: progress ?? null });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`progress:${clientIp(request)}`, WRITES_PER_MINUTE, 60_000).ok) {
    return NextResponse.json({ error: "Too many updates" }, { status: 429 });
  }

  const { id } = await params;
  if (!getVideo(id, session.user.id)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = progressSchema.safeParse(payload);
  if (!parsed.success) {
    const { message } = firstError(parsed.error);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const progress = saveProgress({
    userId: session.user.id,
    videoId: id,
    position: parsed.data.position,
    duration: parsed.data.duration,
  });

  return NextResponse.json({ progress });
}
