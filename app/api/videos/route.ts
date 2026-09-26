import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listVideos } from "@/lib/db/videos";
import { isSortOption } from "@/lib/video-sort";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;
  const rawSort = url.searchParams.get("sort");

  const videos = listVideos(session.user.id, {
    search,
    sort: isSortOption(rawSort) ? rawSort : "newest",
  });

  return NextResponse.json(
    { videos },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
