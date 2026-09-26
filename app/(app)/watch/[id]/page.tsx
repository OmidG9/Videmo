import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getVideo, listVideos } from "@/lib/db/videos";
import { getProgress } from "@/lib/db/progress";
import { WatchView } from "@/components/player/watch-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const video = getVideo(id);
  return { title: video?.title ?? "Watch" };
}

export default async function WatchPage({ params, searchParams }: Props & { searchParams: SearchParams }) {
  const user = await requireUser();
  const { id } = await params;

  const video = getVideo(id, user.id);
  if (!video) notFound();

  const query = await searchParams;
  const progress = getProgress(user.id, video.id);
  const playlist = listVideos(user.id, { sort: "newest" });

  return (
    <WatchView
      video={video}
      progress={progress}
      playlist={playlist}
      autoPlay={query.autoplay === "1"}
    />
  );
}
