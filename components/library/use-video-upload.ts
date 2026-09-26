"use client";

import { useCallback, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { extensionOf, isSupportedExtension, MAX_UPLOAD_BYTES } from "@/lib/video-formats";
import { formatBytes } from "@/lib/format";
import { useToast } from "@/components/providers/toast-provider";

export type UploadStage = "queued" | "probing" | "uploading" | "done" | "error";

export type UploadItem = {
  key: string;
  file: File;
  title: string;
  stage: UploadStage;
  progress: number;
  error?: string;
};

export const UPLOAD_ACCEPT =
  ".mp4,.webm,.ogv,.mov,.m4v,video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v";

export type UploadController = ReturnType<typeof useVideoUpload>;

/**
 * `maxBytes` must be supplied by the server, because `VIDEMO_MAX_UPLOAD_MB` is
 * not exposed to the client bundle. Defaults to the 1 GiB built-in ceiling.
 */
export function useVideoUpload(maxBytes: number = MAX_UPLOAD_BYTES) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const directoryInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming) return;
      const accepted: UploadItem[] = [];
      const rejected: string[] = [];

      for (const file of Array.from(incoming)) {
        if (!isSupportedExtension(extensionOf(file.name))) {
          rejected.push(`${file.name} — unsupported format`);
          continue;
        }
        if (file.size > maxBytes) {
          rejected.push(`${file.name} — larger than the ${formatBytes(maxBytes)} limit`);
          continue;
        }
        accepted.push({
          key: crypto.randomUUID(),
          file,
          title: file.name
            .replace(extensionOf(file.name), "")
            .replace(/[._]+/g, " ")
            .trim(),
          stage: "queued",
          progress: 0,
        });
      }

      if (rejected.length > 0) {
        toast({
          title: `${rejected.length} file${rejected.length === 1 ? "" : "s"} skipped`,
          description: rejected.slice(0, 3).join(" · "),
          variant: "error",
        });
      }
      if (accepted.length > 0) {
        setItems((current) => [...current, ...accepted]);
        setOpen(true);
      }
    },
    [toast, maxBytes],
  );

  const patch = useCallback((key: string, changes: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setOpen(false);
  }, []);

  async function start(onUploaded?: () => void | Promise<void>) {
    const queue = items.filter((item) => item.stage === "queued" || item.stage === "error");
    if (queue.length === 0) return;

    setRunning(true);
    let uploaded = 0;

    for (const item of queue) {
      try {
        patch(item.key, { stage: "probing", progress: 0, error: undefined });
        const meta = await probeVideo(item.file);

        const body = new FormData();
        body.append("file", item.file, item.file.name);
        body.append("title", item.title || item.file.name);
        body.append("description", "");
        body.append("duration", String(Math.round(meta.duration * 1000) / 1000));
        if (meta.width) body.append("width", String(meta.width));
        if (meta.height) body.append("height", String(meta.height));
        if (meta.thumbnail) body.append("thumbnail", meta.thumbnail);

        patch(item.key, { stage: "uploading" });
        await sendWithProgress(body, (progress) => patch(item.key, { progress }));
        patch(item.key, { stage: "done", progress: 100 });
        uploaded += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";

        // A valid-looking cookie whose account is gone (database reset, deleted
        // user) — signing out is the only way forward, so do it for them.
        if (error instanceof UploadError && error.status === 401) {
          patch(item.key, { stage: "error", error: message });
          setRunning(false);
          toast({ title: "Session expired", description: message, variant: "error" });
          await signOut({ callbackUrl: "/login" });
          return;
        }

        patch(item.key, { stage: "error", error: message });
      }
    }

    setRunning(false);

    if (uploaded > 0) {
      toast({
        title: `${uploaded} video${uploaded === 1 ? "" : "s"} uploaded`,
        description: "Your library has been updated.",
        variant: "success",
      });
      await onUploaded?.();
    }
  }

  return {
    items,
    open,
    setOpen,
    running,
    addFiles,
    patch,
    remove,
    reset,
    start,
    fileInput,
    directoryInput,
  };
}

type VideoMeta = {
  duration: number;
  width: number;
  height: number;
  thumbnail: string | null;
};

/**
 * Reads duration/resolution in the browser and grabs a poster frame with a
 * canvas, so thumbnails need no ffmpeg or native dependency.
 */
function probeVideo(file: File): Promise<VideoMeta> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;

    const finish = (meta: VideoMeta) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(guard);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(meta);
    };

    const guard = window.setTimeout(
      () => finish({ duration: 0, width: 0, height: 0, thumbnail: null }),
      10_000,
    );

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    video.onerror = () => finish({ duration: 0, width: 0, height: 0, thumbnail: null });

    video.onloadeddata = () => {
      const capture = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        let thumbnail: string | null = null;

        try {
          if (width > 0 && height > 0) {
            const scale = Math.min(1, 640 / width);
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(2, Math.round(width * scale));
            canvas.height = Math.max(2, Math.round(height * scale));
            const context = canvas.getContext("2d");
            if (context) {
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              thumbnail = canvas.toDataURL("image/jpeg", 0.82);
            }
          }
        } catch {
          thumbnail = null;
        }

        finish({
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          width,
          height,
          thumbnail,
        });
      };

      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      // A frame from the middle is far more representative than the first one.
      if (duration > 2) {
        video.onseeked = capture;
        video.currentTime = Math.min(duration * 0.35, duration - 0.25);
      } else {
        capture();
      }
    };

    video.src = url;
  });
}

class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

function sendWithProgress(body: FormData, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/videos/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      let message = `Upload failed (${xhr.status})`;
      try {
        const data = JSON.parse(xhr.responseText) as { error?: string };
        if (data.error) message = data.error;
      } catch {
        /* keep the status-code message */
      }
      reject(new UploadError(message, xhr.status));
    };

    xhr.onerror = () => reject(new UploadError("Network error during upload", 0));
    xhr.onabort = () => reject(new UploadError("Upload cancelled", 0));
    xhr.send(body);
  });
}
