"use client";

import { useRef, useState } from "react";
import { formatBytes } from "@/lib/format";
import { extensionOf } from "@/lib/video-formats";
import { Button, Spinner } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { UploadController, UploadStage } from "./use-video-upload";

const STAGE_COPY: Record<UploadStage, string> = {
  queued: "Ready",
  probing: "Reading metadata…",
  uploading: "Uploading",
  done: "Uploaded",
  error: "Failed",
};

type Props = {
  upload: UploadController;
  onClose: () => void;
  onUpload: () => void | Promise<void>;
};

export function UploadDialog({ upload, onClose, onUpload }: Props) {
  const { items, running, addFiles, patch, remove } = upload;
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const done = items.filter((item) => item.stage === "done").length;
  const failed = items.filter((item) => item.stage === "error").length;
  const queued = items.filter((item) => item.stage === "queued" || item.stage === "error");
  const allSettled = items.length > 0 && done + failed === items.length;

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Add videos"
      description="MP4, WebM, OGV, MOV or M4V. Files stay on this machine — nothing is sent to a third party."
      footer={
        allSettled ? (
          <>
            <Button variant="ghost" onClick={() => upload.fileInput.current?.click()}>
              Add more
            </Button>
            <Button onClick={onClose}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={running}>
              Cancel
            </Button>
            <Button
              onClick={() => void onUpload()}
              loading={running}
              disabled={items.length === 0}
            >
              {running
                ? "Uploading…"
                : `Upload ${queued.length || "video"}${queued.length === 1 ? "" : "s"}`}
            </Button>
          </>
        )
      }
    >
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
          dragging
            ? "border-brand-400/70 bg-brand-500/10"
            : "border-ink-600/80 bg-ink-900/40 hover:border-ink-500"
        }`}
      >
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-ink-600 bg-ink-800/80 text-brand-300">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" strokeLinecap="round" />
          </svg>
        </span>

        <p className="mt-4 text-sm font-medium text-mist-100">
          {dragging ? "Drop to add" : "Drag videos here"}
        </p>
        <p className="mt-1 text-xs text-mist-500">or pick them from your machine</p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => upload.fileInput.current?.click()}>
            Choose files
          </Button>
          <Button variant="subtle" size="sm" onClick={() => upload.directoryInput.current?.click()}>
            Choose folder
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <ul className="mt-5 space-y-2">
          {items.map((item) => {
            const locked = running || item.stage === "done";
            return (
              <li
                key={item.key}
                className="flex items-center gap-3 rounded-xl border border-ink-700/70 bg-ink-900/50 p-3"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink-800 text-[0.6rem] font-bold uppercase text-mist-400">
                  {extensionOf(item.file.name).replace(".", "")}
                </span>

                <div className="min-w-0 flex-1">
                  <Input
                    value={item.title}
                    readOnly={locked}
                    onChange={(event) => patch(item.key, { title: event.target.value })}
                    placeholder="Video title"
                    aria-label="Video title"
                    className="h-9 border-transparent bg-transparent px-0 text-sm font-medium hover:border-ink-600 focus:bg-ink-900"
                  />

                  <div className="mt-1 flex items-center gap-2 text-[0.7rem] text-mist-500">
                    <span className="tabular-nums">{formatBytes(item.file.size)}</span>
                    <span aria-hidden>·</span>
                    <span
                      className={
                        item.stage === "error"
                          ? "text-rose-glow"
                          : item.stage === "done"
                            ? "text-mint-glow"
                            : ""
                      }
                    >
                      {item.error ?? STAGE_COPY[item.stage]}
                    </span>
                  </div>

                  {item.stage === "uploading" && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-brand-500 to-aqua-400 transition-[width] duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {item.stage === "probing" && (
                    <div className="mt-2 flex items-center gap-1.5 text-[0.7rem] text-mist-500">
                      <Spinner className="size-3" /> Generating poster frame
                    </div>
                  )}
                </div>

                {!running && item.stage !== "uploading" && (
                  <button
                    type="button"
                    onClick={() => remove(item.key)}
                    aria-label={`Remove ${item.file.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-mist-500 transition-colors hover:bg-rose-glow/10 hover:text-rose-glow"
                  >
                    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {done > 0 && (
        <p className="mt-4 text-xs text-mist-500">
          {done} of {items.length} uploaded
          {failed > 0 && ` · ${failed} failed`}. Close this dialog to see your library.
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-mist-500">
        A poster frame is captured in your browser at upload time, so the grid never needs ffmpeg.
        Playback position is saved automatically as you watch and resumes where you stopped.
      </p>
    </Modal>
  );
}
