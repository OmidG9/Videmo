"use client";

import { Button } from "@/components/ui/button";
import {
  UPLOAD_ACCEPT,
  useVideoUpload,
  type UploadController,
} from "./use-video-upload";
import { UploadDialog } from "./upload-dialog";

type Props = {
  onUploaded?: () => void | Promise<void>;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  /** Server-provided upload ceiling, see `useVideoUpload`. */
  maxBytes?: number;
};

export function UploadButton({
  onUploaded,
  size = "sm",
  label = "Upload",
  className = "",
  maxBytes,
}: Props) {
  const upload = useVideoUpload(maxBytes);
  const { open, setOpen, running, addFiles, reset, start, fileInput, directoryInput } = upload;

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept={UPLOAD_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={directoryInput}
        type="file"
        multiple
        className="hidden"
        // Non-standard but supported in Chromium, WebKit and Gecko.
        {...{ webkitdirectory: "", directory: "" }}
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <Button size={size} onClick={() => setOpen(true)} leadingIcon={<PlusIcon />} className={className}>
        {label}
      </Button>

      {open && (
        <UploadDialog
          upload={upload}
          onClose={() => {
            if (running) return;
            setOpen(false);
            reset();
          }}
          onUpload={() => start(onUploaded)}
        />
      )}
    </>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 4.5v11M4.5 10h11" strokeLinecap="round" />
    </svg>
  );
}

export type { UploadController };
export { useVideoUpload };
