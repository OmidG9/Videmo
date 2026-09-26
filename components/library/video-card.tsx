"use client";

import Image from "next/image";
import Link from "next/link";
import { formatBytes, formatCount, formatRelativeTime, formatTime } from "@/lib/format";
import type { VideoWithProgress } from "@/lib/db/videos";
import { PlayIcon } from "@/components/player/player-icons";

type Props = {
  video: VideoWithProgress;
  layout?: "grid" | "list";
  onDelete: (video: VideoWithProgress) => void;
};

export function VideoCard({ video, layout = "grid", onDelete }: Props) {
  const position = video.progress?.position ?? 0;
  const watched = position > 0 && !video.progress?.completed;
  const percent = watched && video.duration > 0 ? (position / video.duration) * 100 : 0;

  if (layout === "list") {
    return (
      <li className="group flex items-center gap-4 rounded-xl border border-ink-700/60 bg-ink-850/40 p-2.5 transition-colors hover:border-ink-600 hover:bg-ink-800/60">
        <Link
          href={`/watch/${video.id}`}
          className="relative block w-32 shrink-0 overflow-hidden rounded-lg bg-ink-800 sm:w-40"
        >
          <Poster id={video.id} hasThumbnail={video.hasThumbnail} className="aspect-video w-full" />
          <span className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="grid size-9 place-items-center rounded-full bg-white/90 text-black">
              <PlayIcon className="ml-0.5 size-4" />
            </span>
          </span>
          {watched && <Progress percent={percent} className="absolute inset-x-0 bottom-0" />}
          {video.duration > 0 && (
            <Badge className="absolute right-1 top-1">{formatTime(video.duration)}</Badge>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/watch/${video.id}`}
            className="line-clamp-1 text-sm font-semibold text-mist-100 transition-colors hover:text-brand-200"
          >
            {video.title}
          </Link>
          <p className="mt-1 text-xs text-mist-500">
            {formatRelativeTime(video.createdAt)} · {formatBytes(video.sizeBytes)}
            {video.views > 0 && ` · ${formatCount(video.views)} views`}
            {watched && ` · ${formatTime(position)} in`}
          </p>
        </div>

        <DeleteButton onClick={() => onDelete(video)} title={video.title} />
      </li>
    );
  }

  return (
    <li className="group relative">
      <Link
        href={`/watch/${video.id}`}
        className="block overflow-hidden rounded-xl border border-ink-700/60 bg-ink-850/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500/45 hover:shadow-glow"
      >
        <div className="relative overflow-hidden bg-ink-900">
          <Poster
            id={video.id}
            hasThumbnail={video.hasThumbnail}
            className="aspect-video w-full transition-transform duration-500 group-hover:scale-[1.04]"
          />

          <span className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-90" />

          <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="grid size-14 place-items-center rounded-full border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
              <PlayIcon className="ml-0.5 size-6" />
            </span>
          </span>

          {video.duration > 0 && <Badge className="absolute right-2 top-2">{formatTime(video.duration)}</Badge>}

          {video.progress?.completed && (
            <span className="absolute left-2 top-2 rounded-md border border-mint-glow/40 bg-mint-glow/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-mint-glow backdrop-blur">
              Watched
            </span>
          )}

          {watched && <Progress percent={percent} className="absolute inset-x-0 bottom-0" />}
        </div>

        <div className="p-3.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-mist-100 transition-colors group-hover:text-brand-200">
            {video.title}
          </h3>
          <p className="mt-1.5 text-[0.7rem] text-mist-500">
            {formatRelativeTime(video.createdAt)}
            <span aria-hidden> · </span>
            {formatBytes(video.sizeBytes)}
            {video.views > 0 && (
              <>
                <span aria-hidden> · </span>
                {formatCount(video.views)} views
              </>
            )}
          </p>
        </div>
      </Link>

      <div className="absolute right-2 top-[calc(50%+1.25rem)] -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
        <DeleteButton onClick={() => onDelete(video)} title={video.title} solid />
      </div>
    </li>
  );
}

function DeleteButton({
  onClick,
  title,
  solid = false,
}: {
  onClick: () => void;
  title: string;
  solid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      aria-label={`Delete ${title}`}
      title="Delete video"
      className={`grid size-8 place-items-center rounded-lg text-mist-400 transition-colors hover:bg-rose-glow/20 hover:text-rose-glow ${
        solid ? "border border-white/15 bg-black/60 backdrop-blur-md" : "hover:bg-ink-700"
      }`}
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6.5 6l.6 9.2A1.5 1.5 0 0 0 8.6 16.6h2.8a1.5 1.5 0 0 0 1.5-1.4L13.5 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Poster({ id, hasThumbnail, className }: { id: string; hasThumbnail: boolean; className: string }) {
  if (!hasThumbnail) {
    return (
      <span className={`grid place-items-center bg-linear-to-br from-ink-700 via-ink-800 to-ink-900 ${className}`}>
        <PlayIcon className="size-8 text-white/15" />
      </span>
    );
  }
  return (
    <Image
      src={`/api/videos/${id}/thumbnail`}
      alt=""
      fill
      unoptimized
      sizes="(max-width: 640px) 100vw, (max-width: 1536px) 50vw, 25vw"
      className={`object-cover ${className}`}
    />
  );
}

function Progress({ percent, className = "" }: { percent: number; className?: string }) {
  return (
    <div className={`h-1 bg-white/20 ${className}`}>
      <div className="h-full bg-linear-to-r from-brand-400 to-aqua-400" style={{ width: `${percent}%` }} />
    </div>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={`rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[0.65rem] tabular-nums text-white/90 backdrop-blur ${className}`}
    >
      {children}
    </span>
  );
}
