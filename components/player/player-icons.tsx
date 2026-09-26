import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M7.6 4.9c0-1 1.1-1.6 1.9-1L19 10.6c.8.5.8 1.6 0 2.1L9.5 19.4c-.8.5-1.9 0-1.9-.9V4.9Z" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <rect x="6" y="4.5" width="4" height="15" rx="1.4" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.4" />
    </svg>
  );
}

export function ReplayIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export function Back10Icon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden {...props}>
      <path d="M12 5.5A7.5 7.5 0 1 1 4.6 10" strokeLinecap="round" />
      <path d="M3 4.5V9h4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.4 9.6v4.8l4-2.4-4-2.4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Forward10Icon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden {...props}>
      <path d="M12 5.5A7.5 7.5 0 1 0 19.4 10" strokeLinecap="round" />
      <path d="M21 4.5V9h-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.6 9.6v4.8l-4-2.4 4-2.4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PrevIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M7 5.5a.9.9 0 0 0-1.8 0v13a.9.9 0 0 0 1.8 0v-4.7l9 4.9a.9.9 0 0 0 1.35-.78V6.08a.9.9 0 0 0-1.35-.78l-9 4.9V5.5Z" />
    </svg>
  );
}

export function NextIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M17 5.5a.9.9 0 0 1 1.8 0v13a.9.9 0 0 1-1.8 0v-4.7l-9 4.9a.9.9 0 0 1-1.35-.78V6.08a.9.9 0 0 1 1.35-.78l9 4.9V5.5Z" />
    </svg>
  );
}

export function VolumeHighIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.4 6.3a8 8 0 0 1 0 11.4" />
    </svg>
  );
}

export function VolumeLowIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
    </svg>
  );
}

export function VolumeMuteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9.5h3L11.5 6v12L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
      <path d="m16 10 4 4m0-4-4 4" />
    </svg>
  );
}

export function FullscreenIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5V9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15M15 20h3.5a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  );
}

export function FullscreenExitIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9h3.5A1.5 1.5 0 0 0 9 7.5V4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20M20 15h-3.5a1.5 1.5 0 0 0-1.5 1.5V20" />
    </svg>
  );
}

export function PipIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

export function AirPlayIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 17H5.5A2.5 2.5 0 0 1 3 14.5v-8A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v8a2.5 2.5 0 0 1-2.5 2.5H18" />
      <path d="M12 14l4 5H8l4-5Z" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

export function SpeedIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 17a8.5 8.5 0 1 1 15 0" />
      <path d="m12 13 4-4" />
      <circle cx="12" cy="14" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function ClosedCaptionIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M10 10.2a2.6 2.6 0 1 0 0 3.6M17.5 10.2a2.6 2.6 0 1 0 0 3.6" />
    </svg>
  );
}

export function SpinnerIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin-slow ${className}`} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 8.5v4.5M12 16.5h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
