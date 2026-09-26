"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VideoPlayer, type PlaylistItem } from "@/components/player/video-player";
import { PlayIcon } from "@/components/player/player-icons";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/providers/toast-provider";
import {
  formatBytes,
  formatCount,
  formatDate,
  formatTime,
} from "@/lib/format";
import type { Video, VideoWithProgress } from "@/lib/db/videos";
import type { Progress } from "@/lib/db/progress";

type Props = {
  video: Video;
  progress: Progress | undefined;
  playlist: VideoWithProgress[];
  /** Set when the page was reached by advancing from another video. */
  autoPlay?: boolean;
};

const SHORTCUTS = [
  ["Space / K", "Play or pause"],
  ["J / L", "Back or forward 10s"],
  ["← / →", "Seek 5 seconds"],
  ["↑ / ↓", "Volume"],
  ["M", "Mute"],
  ["F", "Fullscreen"],
  ["P", "Picture in picture"],
  ["N / ,", "Next or previous"],
  ["0 – 9", "Jump to percentage"],
];

export function WatchView({ video, progress, playlist, autoPlay = false }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const counted = useRef(false);

  const streamUrl = `/api/videos/${video.id}/stream`;
  const posterUrl = video.hasThumbnail ? `/api/videos/${video.id}/thumbnail` : null;

  const queue: PlaylistItem[] = playlist.map((item) => ({
    id: item.id,
    title: item.title,
    duration: item.duration,
    hasThumbnail: item.hasThumbnail,
    position: item.progress?.position ?? 0,
  }));

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    void fetch(`/api/videos/${video.id}/view`, { method: "POST" }).catch(() => undefined);
  }, [video.id]);

  const saveProgress = useCallback(
    (position: number, duration: number) => {
      void fetch(`/api/videos/${video.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, duration }),
        keepalive: true,
      }).catch(() => undefined);
    },
    [video.id],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-5">
        <VideoPlayer
          key={video.id}
          src={streamUrl}
          videoId={video.id}
          poster={posterUrl}
          title={video.title}
          initialPosition={progress?.completed ? 0 : (progress?.position ?? 0)}
          initialDuration={progress?.duration ?? video.duration}
          playlist={queue}
          autoPlay={autoPlay}
          onProgress={saveProgress}
          className="rounded-2xl"
        />

        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-mist-100 sm:text-2xl">
                {video.title}
              </h1>
              <p className="mt-1.5 text-xs text-mist-500">
                {[
                  video.duration > 0 ? formatTime(video.duration) : null,
                  formatBytes(video.sizeBytes),
                  video.width && video.height ? `${video.width}×${video.height}` : null,
                  `${formatCount(video.views)} views`,
                  `added ${formatDate(video.createdAt)}`,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowShortcuts(true)}>
                Shortcuts
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-rose-glow hover:bg-rose-glow/10">
                Delete
              </Button>
            </div>
          </div>

          {video.description && (
            <p className="whitespace-pre-wrap rounded-xl border border-ink-700/60 bg-ink-850/40 p-4 text-sm leading-relaxed text-mist-300">
              {video.description}
            </p>
          )}

          <details className="group rounded-xl border border-ink-700/60 bg-ink-850/40">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-mist-200">
              Keyboard shortcuts
              <ChevronIcon className="size-4 text-mist-500 transition-transform group-open:rotate-180" />
            </summary>
            <dl className="grid gap-x-6 gap-y-2 border-t border-ink-700/60 px-4 py-3 sm:grid-cols-2">
              {SHORTCUTS.map(([key, description]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <dt className="text-xs text-mist-400">{description}</dt>
                  <dd>
                    <kbd className="rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 font-mono text-[0.65rem] text-mist-300">
                      {key}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        </section>
      </div>

      <aside className="min-w-0">
        <div className="surface flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl xl:sticky xl:top-24">
          <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-3.5">
            <h2 className="text-sm font-semibold text-mist-100">
              Up next
              <span className="ml-2 text-xs font-normal text-mist-500">{playlist.length}</span>
            </h2>
            <Link
              href="/library"
              className="text-xs text-mist-400 transition-colors hover:text-brand-300"
            >
              Library
            </Link>
          </div>

          {playlist.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-mist-500">Nothing to play yet.</p>
          ) : (
            <ol className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-2">
              {playlist.map((item, index) => {
                const active = item.id === video.id;
                const itemProgress = item.progress?.position ?? 0;
                const watching = itemProgress > 0 && !item.progress?.completed;

                return (
                  <li key={item.id}>
                    <Link
                      href={`/watch/${item.id}`}
                      aria-current={active ? "true" : undefined}
                      className={`flex gap-3 rounded-xl p-2 transition-colors ${
                        active ? "bg-brand-500/15 ring-1 ring-brand-500/40" : "hover:bg-ink-700/50"
                      }`}
                    >
                      <span className="relative block w-28 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                        <Poster id={item.id} hasThumbnail={item.hasThumbnail} className="aspect-video w-full" />
                        {item.duration > 0 && (
                          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 font-mono text-[0.6rem] tabular-nums text-white">
                            {formatTime(item.duration)}
                          </span>
                        )}
                        {watching && item.duration > 0 && (
                          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/25">
                            <span
                              className="block h-full bg-brand-400"
                              style={{ width: `${(itemProgress / item.duration) * 100}%` }}
                            />
                          </span>
                        )}
                      </span>

                      <span className="min-w-0 flex-1 py-0.5">
                        <span
                          className={`line-clamp-2 text-xs font-medium leading-snug ${
                            active ? "text-brand-200" : "text-mist-200"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="mt-1 block text-[0.65rem] text-mist-500">
                          {index + 1} · {formatBytes(item.sizeBytes)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </aside>

      {editing && (
        <EditVideoDialog
          key={video.id}
          video={video}
          busy={busy}
          onClose={() => setEditing(false)}
          onSave={async (patch) => {
            setBusy(true);
            try {
              const response = await fetch(`/api/videos/${video.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) {
                throw new Error((data as { error?: string }).error ?? "Save failed");
              }
              setEditing(false);
              toast({ title: "Details saved", variant: "success" });
              router.refresh();
            } catch (error) {
              toast({
                title: "Could not save",
                description: error instanceof Error ? error.message : undefined,
                variant: "error",
              });
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      <Modal
        open={confirmDelete}
        onClose={() => !busy && setConfirmDelete(false)}
        size="sm"
        title="Delete this video?"
        description="The file and its watch progress are removed from disk. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const response = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
                  if (!response.ok && response.status !== 204) throw new Error("Delete failed");
                  toast({ title: "Video deleted", variant: "success" });
                  router.replace("/library");
                  router.refresh();
                } catch (error) {
                  toast({
                    title: "Could not delete",
                    description: error instanceof Error ? error.message : undefined,
                    variant: "error",
                  });
                  setBusy(false);
                }
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="rounded-xl border border-ink-700 bg-ink-900/60 p-3.5 text-sm font-medium text-mist-100">
          {video.title}
        </p>
      </Modal>

      <Modal open={showShortcuts} onClose={() => setShowShortcuts(false)} size="sm" title="Keyboard shortcuts">
        <dl className="space-y-2">
          {SHORTCUTS.map(([key, description]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-mist-300">{description}</dt>
              <dd>
                <kbd className="rounded border border-ink-600 bg-ink-800 px-2 py-1 font-mono text-xs text-mist-200">
                  {key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs leading-relaxed text-mist-500">
          Shortcuts are ignored while you are typing in a field.
        </p>
      </Modal>
    </div>
  );
}

function EditVideoDialog({
  video,
  busy,
  onClose,
  onSave,
}: {
  video: Video;
  busy: boolean;
  onClose: () => void;
  onSave: (patch: { title?: string; description?: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [error, setError] = useState<string | undefined>();

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit details"
      description="Renaming does not rename the file on disk."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            loading={busy}
            onClick={() => {
              const trimmed = title.trim();
              if (!trimmed) {
                setError("Title is required");
                return;
              }
              void onSave({ title: trimmed, description });
            }}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-1">
        <Field label="Title" error={error}>
          {({ id, invalid }) => (
            <Input
              id={id}
              data-autofocus
              value={title}
              invalid={invalid}
              maxLength={140}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(undefined);
              }}
            />
          )}
        </Field>

        <Field label="Description" hint="Optional. Plain text, up to 2000 characters.">
          {({ id }) => (
            <Textarea
              id={id}
              value={description}
              maxLength={2000}
              rows={5}
              placeholder="What is this video about?"
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}

function Poster({ id, hasThumbnail, className }: { id: string; hasThumbnail: boolean; className: string }) {
  if (!hasThumbnail) {
    return (
      <span className={`grid place-items-center bg-linear-to-br from-ink-700 to-ink-900 ${className}`}>
        <PlayIcon className="size-4 text-white/15" />
      </span>
    );
  }
  return (
    <Image
      src={`/api/videos/${id}/thumbnail`}
      alt=""
      fill
      unoptimized
      sizes="112px"
      className={`object-cover ${className}`}
    />
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
