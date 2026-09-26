"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { VideoWithProgress } from "@/lib/db/videos";
import { formatBytes, formatCount, formatTime } from "@/lib/format";
import { SORT_OPTIONS } from "@/lib/video-sort";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/brand";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/providers/toast-provider";
import { UploadButton } from "./upload-button";
import { useVideoUpload } from "./use-video-upload";
import { UploadDialog } from "./upload-dialog";
import { VideoCard } from "./video-card";

type Sort = (typeof SORT_OPTIONS)[number];
type Filter = "all" | "in-progress" | "completed" | "unwatched";

const SORT_LABEL: Record<Sort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title A–Z",
  largest: "Largest file",
  longest: "Longest",
  views: "Most viewed",
};

const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  "in-progress": "In progress",
  completed: "Finished",
  unwatched: "Not started",
};

type Props = {
  initialVideos: VideoWithProgress[];
  /** Server-provided upload ceiling, see `useVideoUpload`. */
  maxUploadBytes?: number;
};

export function LibraryView({ initialVideos, maxUploadBytes }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const upload = useVideoUpload(maxUploadBytes);

  const [videos, setVideos] = useState(initialVideos);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [filter, setFilter] = useState<Filter>("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [pendingDelete, setPendingDelete] = useState<VideoWithProgress | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Adopt new server props during render (the sanctioned "adjust state" pattern)
  // so an upload started from the header flows straight into the grid.
  const [serverVideos, setServerVideos] = useState(initialVideos);
  if (initialVideos !== serverVideos) {
    setServerVideos(initialVideos);
    setVideos(initialVideos);
  }

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();

    const filtered = videos.filter((video) => {
      if (term && !`${video.title} ${video.originalName}`.toLowerCase().includes(term)) return false;
      const position = video.progress?.position ?? 0;
      switch (filter) {
        case "in-progress":
          return position > 0 && !video.progress?.completed;
        case "completed":
          return Boolean(video.progress?.completed);
        case "unwatched":
          return position === 0;
        default:
          return true;
      }
    });

    const order: Record<Sort, (a: VideoWithProgress, b: VideoWithProgress) => number> = {
      newest: (a, b) => b.createdAt - a.createdAt,
      oldest: (a, b) => a.createdAt - b.createdAt,
      title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      largest: (a, b) => b.sizeBytes - a.sizeBytes,
      longest: (a, b) => b.duration - a.duration,
      views: (a, b) => b.views - a.views,
    };

    return [...filtered].sort(order[sort]);
  }, [videos, query, sort, filter]);

  const stats = useMemo(() => {
    const completed = videos.filter((v) => v.progress?.completed).length;
    const seconds = videos.reduce((sum, v) => sum + (v.progress?.completed ? v.duration : 0), 0);
    return {
      total: videos.length,
      completed,
      seconds,
      size: videos.reduce((sum, v) => sum + v.sizeBytes, 0),
      views: videos.reduce((sum, v) => sum + v.views, 0),
    };
  }, [videos]);

  async function refreshFromApi() {
    try {
      const response = await fetch("/api/videos?sort=newest", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { videos: VideoWithProgress[] };
      setVideos(data.videos);
    } catch {
      /* keep the current list; the server render will catch up on refresh */
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/videos/${pendingDelete.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Delete failed");
      }
      setVideos((current) => current.filter((v) => v.id !== pendingDelete.id));
      toast({ title: "Video deleted", description: pendingDelete.title, variant: "success" });
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not delete",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-mist-100 sm:text-3xl">
            Your library
          </h1>
          <p className="mt-1.5 text-sm text-mist-400">
            {stats.total === 0
              ? "Nothing here yet — upload your first video."
              : `${stats.total} video${stats.total === 1 ? "" : "s"} · ${formatBytes(stats.size)} on disk · ${formatCount(stats.views)} views`}
          </p>
        </div>

        <UploadButton
          size="md"
          maxBytes={maxUploadBytes}
          onUploaded={async () => {
            await refreshFromApi();
            router.refresh();
          }}
        />
      </section>

      {stats.total > 0 && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Videos" value={String(stats.total)} />
          <Stat label="Finished" value={String(stats.completed)} accent="text-mint-glow" />
          <Stat label="Watch time" value={formatTime(stats.seconds)} accent="text-aqua-300" />
          <Stat label="Total views" value={formatCount(stats.views)} accent="text-brand-300" />
        </section>
      )}

      {stats.total > 0 && (
        <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <svg
                viewBox="0 0 20 20"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <circle cx="9" cy="9" r="6" />
                <path d="m13.5 13.5 3 3" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles…"
                aria-label="Search videos"
                className="h-10 w-full rounded-xl border border-ink-600 bg-ink-900/70 pl-9 pr-3 text-sm text-mist-100 placeholder:text-mist-500 outline-none transition-all focus:border-brand-400/70 focus:ring-4 focus:ring-brand-500/15"
              />
            </div>

            <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-ink-700 bg-ink-900/50 p-1">
              {(Object.keys(FILTER_LABEL) as Filter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === key
                      ? "bg-brand-500/20 text-brand-200"
                      : "text-mist-400 hover:bg-ink-700/60 hover:text-mist-200"
                  }`}
                >
                  {FILTER_LABEL[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort videos"
              className="h-10 rounded-xl border border-ink-600 bg-ink-900/70 px-3 text-sm text-mist-200 outline-none transition-colors focus:border-brand-400/70"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-ink-900">
                  {SORT_LABEL[option]}
                </option>
              ))}
            </select>

            <div className="flex rounded-xl border border-ink-600 bg-ink-900/50 p-1">
              {(["grid", "list"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayout(mode)}
                  aria-label={`${mode} view`}
                  aria-pressed={layout === mode}
                  className={`grid size-8 place-items-center rounded-lg transition-colors ${
                    layout === mode ? "bg-ink-700 text-mist-100" : "text-mist-500 hover:text-mist-300"
                  }`}
                >
                  {mode === "grid" ? <GridIcon /> : <ListIcon />}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {stats.total === 0 ? (
        <EmptyState
          icon={<UploadGlyph />}
          title="Your library is empty"
          description="Upload MP4, WebM, OGV, MOV or M4V files. Everything is stored on this machine in a local SQLite database — no server, no cloud, no limits."
          action={
            <Button size="lg" onClick={() => upload.setOpen(true)} leadingIcon={<PlusGlyph />}>
              Upload a video
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<SearchGlyph />}
          title="No matches"
          description={
            query
              ? `Nothing matches “${query}”. Try a different search.`
              : "No videos in this filter yet."
          }
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.map((video) => (
            <VideoCard key={video.id} video={video} onDelete={setPendingDelete} />
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {visible.map((video) => (
            <VideoCard key={video.id} video={video} layout="list" onDelete={setPendingDelete} />
          ))}
        </ul>
      )}

      {upload.open && (
        <UploadDialog
          upload={upload}
          onClose={() => {
            if (upload.running) return;
            upload.setOpen(false);
            upload.reset();
          }}
          onUpload={() => upload.start()}
        />
      )}

      <Modal
        open={pendingDelete !== null}
        onClose={() => !deleting && setPendingDelete(null)}
        size="sm"
        title="Delete this video?"
        description="The file and its watch progress are removed from disk. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="rounded-xl border border-ink-700 bg-ink-900/60 p-3.5 text-sm font-medium text-mist-100">
          {pendingDelete?.title}
        </p>
      </Modal>
    </div>
  );
}

function Stat({ label, value, accent = "text-mist-100" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-850/50 px-4 py-3.5">
      <p className={`text-xl font-semibold tabular-nums tracking-tight ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[0.7rem] uppercase tracking-wider text-mist-500">{label}</p>
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-ink-700/60">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-2 p-3.5">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="6" height="6" rx="1.4" />
      <rect x="11" y="3" width="6" height="6" rx="1.4" />
      <rect x="3" y="11" width="6" height="6" rx="1.4" />
      <rect x="11" y="11" width="6" height="6" rx="1.4" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
      <rect x="3" y="4" width="14" height="3" rx="1.4" />
      <rect x="3" y="9" width="14" height="3" rx="1.4" />
      <rect x="3" y="14" width="14" height="3" rx="1.4" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 4.5v11M4.5 10h11" strokeLinecap="round" />
    </svg>
  );
}

function UploadGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" strokeLinecap="round" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" strokeLinecap="round" />
    </svg>
  );
}
