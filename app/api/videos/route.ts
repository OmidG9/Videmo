import { NextResponse } from "next/server";
import { getVerifiedUser, UNAUTHORIZED } from "@/lib/auth/session";
import { listVideos } from "@/lib/db/videos";
import { isSortOption } from "@/lib/video-sort";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getVerifiedUser();
  if (!user) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;
  const rawSort = url.searchParams.get("sort");

  const videos = listVideos(user.id, {
    search,
    sort: isSortOption(rawSort) ? rawSort : "newest",
  });

  return NextResponse.json(
    { videos },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
