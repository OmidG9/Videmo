"use client";

import { useCallback, useRef, useState } from "react";
import { clamp, formatTime } from "@/lib/format";

type TimelineProps = {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  onScrub?: (scrolling: boolean) => void;
  disabled?: boolean;
};

const MAX_BUFFERED_BARS = 40;

export function Timeline({
  currentTime,
  duration,
  buffered,
  onSeek,
  onScrub,
  disabled = false,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const safeDuration = duration > 0 ? duration : 0;
  const playedRatio = safeDuration > 0 ? clamp(currentTime / safeDuration, 0, 1) : 0;
  const bufferedRatio = safeDuration > 0 ? clamp(buffered / safeDuration, 0, 1) : 0;

  const timeFromEvent = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return 0;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return ratio * safeDuration;
    },
    [safeDuration],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || safeDuration === 0) return;
    event.preventDefault();
    trackRef.current?.setPointerCapture(event.pointerId);
    setDragging(true);
    onScrub?.(true);
    onSeek(timeFromEvent(event.clientX));
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || safeDuration === 0) return;
    const time = timeFromEvent(event.clientX);
    setHoverTime(time);
    if (dragging) onSeek(time);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    onScrub?.(false);
    if (trackRef.current?.hasPointerCapture(event.pointerId)) {
      trackRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const hoverRatio = hoverTime !== null && safeDuration > 0 ? hoverTime / safeDuration : 0;

  return (
    <div
      className={`group/timeline relative flex items-center py-2.5 ${
        disabled ? "pointer-events-none opacity-50" : "cursor-pointer"
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => setHoverTime(null)}
    >
      {hoverTime !== null && safeDuration > 0 && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-ink-600 bg-ink-850/95 px-1.5 py-0.5 font-mono text-[0.7rem] tabular-nums text-mist-100 shadow-lg backdrop-blur"
          style={{ left: `${hoverRatio * 100}%` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}

      <div
        ref={trackRef}
        role="slider"
        tabIndex={-1}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(safeDuration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(safeDuration)}`}
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/12 transition-[height] duration-150 group-hover/timeline:h-2.5"
      >
        <div
          className="absolute inset-y-0 left-0 bg-white/22"
          style={{ width: `${bufferedRatio * 100}%` }}
        />

        <div
          className="absolute inset-y-0 left-0 bg-linear-to-r from-aqua-400 to-brand-400"
          style={{ width: `${playedRatio * 100}%` }}
        >
          {/* Highlight head while scrubbing. */}
          <div className="absolute inset-y-0 right-0 w-8 bg-linear-to-l from-white/35 to-transparent" />
        </div>

        <div
          className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_10px_rgb(0_0_0/0.6)] transition-opacity duration-150 ${
            dragging ? "opacity-100" : "opacity-0 group-hover/timeline:opacity-100"
          }`}
          style={{ left: `${playedRatio * 100}%` }}
        />
      </div>
    </div>
  );
}

export function BufferedBars({ video, duration }: { video: HTMLVideoElement | null; duration: number }) {
  if (!video || duration <= 0) return null;
  const ranges = video.buffered;
  if (ranges.length === 0) return null;

  const bars: { left: number; width: number }[] = [];
  for (let i = 0; i < Math.min(ranges.length, MAX_BUFFERED_BARS); i += 1) {
    bars.push({ left: ranges.start(i) / duration, width: (ranges.end(i) - ranges.start(i)) / duration });
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {bars.map((bar, index) => (
        <span
          key={index}
          className="absolute bottom-0 h-0.5 rounded-full bg-white/10"
          style={{ left: `${bar.left * 100}%`, width: `${bar.width * 100}%` }}
        />
      ))}
    </div>
  );
}
