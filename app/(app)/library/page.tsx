import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { listVideos } from "@/lib/db/videos";
import { MAX_UPLOAD_BYTES } from "@/lib/video-formats";
import { LibraryView } from "@/components/library/library-view";

export const metadata: Metadata = {
  title: "Library",
  description: "Every video in your local library.",
};

export default async function LibraryPage() {
  const user = await requireUser();
  const videos = listVideos(user.id, { sort: "newest" });

  return <LibraryView initialVideos={videos} maxUploadBytes={MAX_UPLOAD_BYTES} />;
}
