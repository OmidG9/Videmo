"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { clamp, formatTime } from "@/lib/format";
import { Timeline } from "./timeline";
import {
  AirPlayIcon,
  AlertIcon,
  Back10Icon,
  ClosedCaptionIcon,
  Forward10Icon,
  FullscreenExitIcon,
  FullscreenIcon,
  NextIcon,
  PauseIcon,
  PipIcon,
  PlayIcon,
  PrevIcon,
  ReplayIcon,
  SpeedIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMuteIcon,
} from "./player-icons";

export type PlaylistItem = {
  id: string;
  title: string;
  duration: number;
  hasThumbnail: boolean;
  position: number;
};

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const SEEK_STEP = 5;
const CONTROLS_TIMEOUT = 2800;
const SAVE_INTERVAL_MS = 5000;
const RESUME_MIN_SECONDS = 5;
const VOLUME_KEY = "videmo:volume";
const RATE_KEY = "videmo:rate";
const CONTROLS_KEY = "videmo:autoplay-next";

type Props = {
  src: string;
  videoId: string;
  poster?: string | null;
  title: string;
  initialPosition?: number;
  initialDuration?: number;
  playlist?: PlaylistItem[];
  /** Start playing as soon as the source is ready. Set when advancing to the next video. */
  autoPlay?: boolean;
  onProgress?: (position: number, duration: number) => void;
  onEnded?: () => void;
  className?: string;
};

function readStoredNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) !== null
    ? window.localStorage.getItem(key) === "true"
    : fallback;
}

export function VideoPlayer({
  src,
  videoId,
  poster,
  title,
  initialPosition = 0,
  initialDuration = 0,
  playlist = [],
  autoPlay = false,
  onProgress,
  onEnded,
  className = "",
}: Props) {
  const router = useRouter();
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const didApplyResume = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [capabilities, setCapabilities] = useState({
    pip: false,
    airplay: false,
    captions: false,
  });

  const currentIndex = useMemo(
    () => playlist.findIndex((item) => item.id === videoId),
    [playlist, videoId],
  );
  const nextItem = currentIndex >= 0 ? playlist[currentIndex + 1] : undefined;
  const prevItem = currentIndex > 0 ? playlist[currentIndex - 1] : undefined;

  const showFlash = useCallback((message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash((f) => (f === message ? null : f)), 2400);
  }, []);

  /* ---------------------------- persistence ---------------------------- */

  const persist = useCallback(
    (position: number, total: number, beacon = false) => {
      if (total <= 0) return;
      if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          `/api/videos/${videoId}/progress`,
          new Blob([JSON.stringify({ position, duration: total })], {
            type: "application/json",
          }),
        );
        return;
      }
      onProgress?.(position, total);
    },
    [onProgress, videoId],
  );

  /* ----------------------------- playback ----------------------------- */

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setError("Playback was blocked by the browser."));
    else video.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = clamp(video.currentTime + delta, 0, video.duration);
  }, []);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = clamp(time, 0, video.duration);
  }, []);

  const changeVolume = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = clamp(value, 0, 1);
    video.volume = next;
    video.muted = next === 0;
    setVolume(next);
    setMuted(next === 0);
    window.localStorage.setItem(VOLUME_KEY, String(next));
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const changeRate = useCallback((value: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = value;
    setRate(value);
    window.localStorage.setItem(RATE_KEY, String(value));
    setSpeedOpen(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      /* Browser refused (iOS Safari has no element fullscreen API). */
    }
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      showFlash("Picture-in-picture is unavailable");
    }
  }, [showFlash]);

  const goTo = useCallback(
    (id: string, autoplay = true) => {
      const video = videoRef.current;
      if (video && video.currentTime > 0) persist(video.currentTime, video.duration, true);
      router.push(autoplay ? `/watch/${id}?autoplay=1` : `/watch/${id}`);
    },
    [persist, router],
  );

  /* --------------------------- media element -------------------------- */

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const storedVolume = readStoredNumber(VOLUME_KEY, 1);
    video.volume = clamp(storedVolume, 0, 1);
    video.muted = video.volume === 0;
    setVolume(video.volume);
    setMuted(video.muted);

    const storedRate = readStoredNumber(RATE_KEY, 1);
    video.playbackRate = clamp(storedRate, 0.25, 2);
    setRate(video.playbackRate);

    setAutoAdvance(readStoredBoolean(CONTROLS_KEY, true));
  }, []);

  useEffect(() => {
    setCapabilities({
      pip: typeof document !== "undefined" && document.pictureInPictureEnabled === true,
      airplay:
        typeof window !== "undefined" &&
        "WebKitPlaybackTargetAvailabilityEvent" in window &&
        videoRef.current !== null &&
        "webkitShowPlaybackTargetPicker" in videoRef.current,
      captions: videoRef.current !== null && videoRef.current.textTracks.length > 0,
    });
  }, []);

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsReady(true);
    if (Number.isFinite(video.duration) && video.duration > 0) setDuration(video.duration);

    if (
      !didApplyResume.current &&
      initialPosition > RESUME_MIN_SECONDS &&
      Number.isFinite(video.duration) &&
      initialPosition < video.duration * 0.95
    ) {
      didApplyResume.current = true;
      video.currentTime = initialPosition;
      setCurrentTime(initialPosition);
      showFlash(`Resumed from ${formatTime(initialPosition)}`);
    }

    if (autoPlay) {
      // May be rejected if the browser has no user gesture yet; the play
      // overlay stays visible, so this degrades to a manual start.
      void video.play().catch(() => undefined);
    }
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
  };

  const onPlay = () => {
    setIsPlaying(true);
    setEnded(false);
    setError(null);
    setControlsVisible(true);
  };

  const onPause = () => {
    setIsPlaying(false);
    const video = videoRef.current;
    if (video) persist(video.currentTime, video.duration);
  };

  const onEndedInternal = () => {
    setIsPlaying(false);
    setEnded(true);
    const video = videoRef.current;
    if (video) persist(video.duration, video.duration);
    onEnded?.();
    // Honour the autoplay toggle: roll straight into the next playlist item.
    if (autoAdvance && nextItem) goTo(nextItem.id);
  };

  const onWaiting = () => setIsBuffering(true);
  const onPlaying = () => setIsBuffering(false);
  const onCanPlay = () => setIsBuffering(false);

  const onError = () => {
    const video = videoRef.current;
    const code = video?.error?.code;
    setError(
      code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        ? "This video format is not supported by your browser."
        : code === MediaError.MEDIA_ERR_NETWORK
          ? "The stream was interrupted."
          : "Something went wrong while loading this video.",
    );
    setIsBuffering(false);
  };

  const retry = () => {
    setError(null);
    setEnded(false);
    const video = videoRef.current;
    if (!video) return;
    video.load();
    void video.play().catch(() => undefined);
  };

  /* ------------------------ periodic progress save -------------------- */

  useEffect(() => {
    saveTimer.current = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && !video.ended) {
        persist(video.currentTime, video.duration);
      }
    }, SAVE_INTERVAL_MS);

    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
    };
  }, [persist]);

  useEffect(() => {
    const flush = () => {
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        persist(video.currentTime, video.duration, true);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [persist]);

  /* ---------------------------- fullscreen ---------------------------- */

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setIsPip(true);
    const onLeave = () => setIsPip(false);
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, []);

  /* ------------------------- auto-hide controls ----------------------- */

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !speedOpen) {
        setControlsVisible(false);
      }
    }, CONTROLS_TIMEOUT);
  }, [speedOpen]);

  // While playing, fade the bar out after a period of inactivity. Pausing is
  // handled by the derived `showChrome` flag, so no state is set here.
  useEffect(() => {
    if (!isPlaying) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      return;
    }
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !speedOpen) {
        setControlsVisible(false);
      }
    }, CONTROLS_TIMEOUT);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isPlaying, speedOpen]);

  /* ----------------------------- keyboard ----------------------------- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.closest("[role=dialog]"))
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const handlers: Record<string, () => void> = {
        " ": togglePlay,
        k: togglePlay,
        j: () => seekBy(-10),
        l: () => seekBy(10),
        ArrowLeft: () => seekBy(-SEEK_STEP),
        ArrowRight: () => seekBy(SEEK_STEP),
        ArrowUp: () => changeVolume((videoRef.current?.volume ?? 0) + 0.05),
        ArrowDown: () => changeVolume((videoRef.current?.volume ?? 0) - 0.05),
        m: toggleMute,
        f: toggleFullscreen,
        p: togglePip,
        n: () => nextItem && goTo(nextItem.id),
        ",": () => prevItem && goTo(prevItem.id),
        Home: () => seekTo(0),
        End: () => seekTo(duration),
      };

      const digit = /^[0-9]$/.test(event.key);
      if (digit) {
        seekTo((Number(event.key) / 10) * duration);
      } else if (handlers[event.key]) {
        handlers[event.key]!();
      } else {
        return;
      }

      event.preventDefault();
      revealControls();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [changeVolume, duration, goTo, nextItem, prevItem, revealControls, seekBy, seekTo, toggleFullscreen, toggleMute, togglePip, togglePlay]);

  /* ---------------------------- rendering ----------------------------- */

  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const showChrome = controlsVisible || !isPlaying || ended || Boolean(error);

  return (
    <div
      ref={shellRef}
      onMouseMove={revealControls}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
      className={`player-shell group/player relative isolate aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-[0_40px_120px_-40px_rgb(0_0_0/1)] ${
        isFullscreen ? "rounded-none" : ""
      } ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onProgress={onTimeUpdate}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEndedInternal}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onCanPlay={onCanPlay}
        onSeeking={onTimeUpdate}
        onSeeked={onTimeUpdate}
        onError={onError}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="size-full cursor-pointer bg-black object-contain"
      />

      {/* Centre feedback: spinner while buffering, play state when paused. */}
      {!error && (isBuffering || (!isPlaying && isReady)) && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isBuffering ? "Buffering" : "Play"}
          className="absolute inset-0 grid place-items-center"
        >
          {isBuffering ? (
            <span className="grid size-16 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
              <SpinnerIcon className="size-7 text-white" />
            </span>
          ) : (
            <span className="grid size-20 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-2xl backdrop-blur-md transition-transform duration-200 hover:scale-105">
              <PlayIcon className="ml-1 size-9" />
            </span>
          )}
        </button>
      )}

      {/* Keyboard hint + resume flash */}
      {flash && (
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 animate-fade-in rounded-full border border-white/12 bg-black/65 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md">
          {flash}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 backdrop-blur-sm">
          <div className="max-w-sm text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full border border-rose-glow/40 bg-rose-glow/10 text-rose-glow">
              <AlertIcon className="size-6" />
            </span>
            <p className="mt-4 text-sm font-medium text-white">{error}</p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={retry}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Try again
              </button>
              <a
                href={src}
                download
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                Download file
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Ended / up-next */}
      {ended && !error && (
        <div className="absolute inset-0 grid place-items-center bg-linear-to-t from-black/90 via-black/60 to-black/20 p-6">
          <div className="w-full max-w-sm animate-scale-in text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Finished
            </p>
            <p className="mt-2 line-clamp-2 text-lg font-semibold text-white">{title}</p>

            {nextItem ? (
              <div className="mt-5">
                <p className="mb-2 text-xs text-white/45">Up next</p>
                <button
                  type="button"
                  onClick={() => goTo(nextItem.id)}
                  className="group/next flex w-full items-center gap-3 rounded-xl border border-white/12 bg-white/8 p-2.5 text-left backdrop-blur-md transition-colors hover:bg-white/14"
                >
                  <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg">
                    <Thumbnail id={nextItem.id} hasThumbnail={nextItem.hasThumbnail} className="size-full" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {nextItem.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-white/50">
                      {formatTime(nextItem.duration)}
                    </span>
                  </span>
                  <NextIcon className="size-4 shrink-0 text-white/70 transition-transform group-hover/next:translate-x-0.5" />
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/50">End of playlist</p>
            )}

            <button
              type="button"
              onClick={() => {
                setEnded(false);
                seekTo(0);
                togglePlay();
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
            >
              <ReplayIcon className="size-4" />
              Watch again
            </button>
          </div>
        </div>
      )}

      {/* Control bar */}
      <div
        onMouseEnter={revealControls}
        className={`absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/90 via-black/55 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-300 sm:px-4 ${
          showChrome ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Timeline
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          onSeek={seekTo}
          disabled={!isReady || duration === 0}
          onScrub={() => setIsBuffering(false)}
        />

        <div className="flex items-center gap-1 sm:gap-2">
          <ControlButton label={isPlaying ? "Pause (k)" : "Play (k)"} onClick={togglePlay} primary>
            {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="ml-0.5 size-5" />}
          </ControlButton>

          <ControlButton label="Back 10s (j)" onClick={() => seekBy(-10)} className="hidden sm:inline-flex">
            <Back10Icon className="size-[18px]" />
          </ControlButton>
          <ControlButton label="Forward 10s (l)" onClick={() => seekBy(10)} className="hidden sm:inline-flex">
            <Forward10Icon className="size-[18px]" />
          </ControlButton>

          {nextItem && (
            <ControlButton label="Next (n)" onClick={() => goTo(nextItem.id)}>
              <NextIcon className="size-4" />
            </ControlButton>
          )}
          {prevItem && (
            <ControlButton label="Previous (,)" onClick={() => goTo(prevItem.id)} className="hidden sm:inline-flex">
              <PrevIcon className="size-4" />
            </ControlButton>
          )}

          <div className="group/vol flex items-center">
            <ControlButton
              label={muted ? "Unmute (m)" : "Mute (m)"}
              onClick={toggleMute}
            >
              {muted || volume === 0 ? (
                <VolumeMuteIcon className="size-[18px]" />
              ) : volume < 0.5 ? (
                <VolumeLowIcon className="size-[18px]" />
              ) : (
                <VolumeHighIcon className="size-[18px]" />
              )}
            </ControlButton>

            <div className="w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover/vol:w-20 group-hover/vol:opacity-100 group-focus-within/vol:w-20 group-focus-within/vol:opacity-100">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Volume"
                className="h-1 w-16 cursor-pointer rounded-full bg-white/25"
              />
            </div>
          </div>

          <span className="ml-1 whitespace-nowrap font-mono text-[0.7rem] tabular-nums text-white/75 sm:text-xs">
            {formatTime(currentTime)}
            <span className="text-white/35"> / {formatTime(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            {nextItem && (
              <label className="mr-1 hidden cursor-pointer select-none items-center gap-1.5 text-[0.7rem] text-white/55 lg:flex">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => {
                    setAutoAdvance(e.target.checked);
                    window.localStorage.setItem(CONTROLS_KEY, String(e.target.checked));
                  }}
                  className="size-3 accent-brand-500"
                />
                Autoplay
              </label>
            )}

            <div className="relative">
              <ControlButton
                label="Playback speed"
                onClick={() => setSpeedOpen((v) => !v)}
                active={speedOpen}
              >
                <SpeedIcon className="size-[18px]" />
              </ControlButton>

              {speedOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close speed menu"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setSpeedOpen(false)}
                  />
                  <div className="absolute bottom-11 right-0 z-20 w-32 animate-scale-in overflow-hidden rounded-xl border border-ink-600 bg-ink-850/95 p-1 shadow-2xl backdrop-blur-xl">
                    {SPEEDS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => changeRate(option)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                          rate === option
                            ? "bg-brand-500/20 text-brand-200"
                            : "text-mist-300 hover:bg-ink-700/70"
                        }`}
                      >
                        <span className="tabular-nums">
                          {option === 1 ? "Normal" : `${option}×`}
                        </span>
                        {rate === option && <span aria-hidden>✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {capabilities.captions && (
              <ControlButton label="Subtitles" onClick={() => undefined} className="hidden sm:inline-flex">
                <ClosedCaptionIcon className="size-[18px]" />
              </ControlButton>
            )}

            {capabilities.airplay && (
              <ControlButton
                label="AirPlay"
                onClick={() =>
                  (
                    videoRef.current as unknown as {
                      webkitShowPlaybackTargetPicker?: () => void;
                    }
                  ).webkitShowPlaybackTargetPicker?.()
                }
                className="hidden sm:inline-flex"
              >
                <AirPlayIcon className="size-[18px]" />
              </ControlButton>
            )}

            {capabilities.pip && (
              <ControlButton label="Picture in picture (p)" onClick={togglePip} active={isPip}>
                <PipIcon className="size-[18px]" />
              </ControlButton>
            )}

            <ControlButton label="Fullscreen (f)" onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExitIcon className="size-[18px]" /> : <FullscreenIcon className="size-[18px]" />}
            </ControlButton>
          </div>
        </div>
      </div>

      {/* Top gradient scrim so the title stays readable over bright frames. */}
      {showChrome && !error && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/65 to-transparent"
        />
      )}

      <span className="sr-only" aria-live="polite">
        {isPlaying ? "Playing" : "Paused"} at {formatTime(currentTime)}
      </span>

      {/* A hairline progress indicator doubles the timeline for keyboard users. */}
      {showChrome && duration > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 bg-white/8">
          <div
            className="h-full bg-linear-to-r from-aqua-400 to-brand-400"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ControlButton({
  children,
  label,
  onClick,
  className = "",
  primary = false,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  primary?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid size-9 shrink-0 place-items-center rounded-lg text-white/85 transition-all duration-150 hover:bg-white/12 hover:text-white active:scale-90 ${
        active ? "bg-white/15 text-white" : ""
      } ${primary ? "hover:bg-white/18" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

function Thumbnail({
  id,
  hasThumbnail,
  className = "",
}: {
  id: string;
  hasThumbnail: boolean;
  className?: string;
}) {
  if (!hasThumbnail) {
    return (
      <span className={`relative grid place-items-center bg-linear-to-br from-ink-700 to-ink-800 text-white/25 ${className}`}>
        <PlayIcon className="size-5" />
      </span>
    );
  }
  return (
    <Image
      src={`/api/videos/${id}/thumbnail`}
      alt=""
      fill
      unoptimized
      sizes="128px"
      className={`object-cover ${className}`}
    />
  );
}
