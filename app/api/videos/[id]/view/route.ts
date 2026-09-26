import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getVideo, incrementViews } from "@/lib/db/videos";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // One view per video per client per 30 minutes.
  if (!rateLimit(`view:${session.user.id}:${(await params).id}`, 1, 30 * 60 * 1000).ok) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const { id } = await params;
  if (!getVideo(id, session.user.id)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  incrementViews(id);
  return NextResponse.json({ ok: true, counted: true });
}
