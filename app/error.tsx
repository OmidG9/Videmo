"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-ink-950 px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-rose-glow/40 bg-rose-glow/10 text-rose-glow">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M12 8.5v4.5M12 16.5h.01" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-mist-100">
          Something broke
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-mist-400">
          An unexpected error stopped this page from rendering. Retrying usually fixes it.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-mist-500">Reference: {error.digest}</p>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Link href="/library">
            <Button size="lg" variant="secondary">
              Back to library
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
