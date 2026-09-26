import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { listVideos } from "@/lib/db/videos";
import { getProgress } from "@/lib/db/progress";
import { WatchView } from "@/components/player/watch-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Now playing" };

/** "Now playing" — jumps straight to the most recently watched video. */
export default async function NowPlayingPage() {
  const user = await requireUser();
  const videos = listVideos(user.id, { sort: "newest" });

  const inProgress = videos.find(
    (video) => (video.progress?.position ?? 0) > 0 && !video.progress?.completed,
  );
  const target = inProgress ?? videos[0];

  if (!target) redirect("/library");

  return (
    <WatchView
      video={target}
      progress={getProgress(user.id, target.id)}
      playlist={videos}
    />
  );
}
