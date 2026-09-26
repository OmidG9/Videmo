import Link from "next/link";
import type { ReactNode } from "react";

export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-linear-to-br from-brand-500 to-aqua-500 shadow-[0_8px_24px_-10px_rgb(139_92_246/0.9)] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-[58%] text-white" fill="currentColor" aria-hidden>
        <path d="M8.5 6.2c0-.86.94-1.39 1.67-.95l8.2 4.98a1.1 1.1 0 0 1 0 1.9l-8.2 4.98a1.1 1.1 0 0 1-1.67-.95V6.2Z" />
      </svg>
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`text-[1.05rem] font-semibold tracking-tight ${className}`}>
      <span className="text-gradient">Vide</span>
      <span className="text-mist-100">mo</span>
    </span>
  );
}

export function BrandLockup({ href = "/library" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <BrandMark className="size-9 transition-transform duration-300 group-hover:scale-105" />
      <Wordmark />
    </Link>
  );
}

export function AuroraBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-ink-950" />
      <div className="absolute -left-40 -top-48 size-[34rem] animate-drift rounded-full bg-brand-600/22 blur-[120px]" />
      <div className="absolute -right-32 top-1/4 size-[28rem] animate-drift rounded-full bg-aqua-500/16 blur-[130px] [animation-delay:-6s]" />
      <div className="absolute bottom-[-18rem] left-1/3 size-[32rem] animate-drift rounded-full bg-rose-glow/10 blur-[140px] [animation-delay:-11s]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.028) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.028) 1px, transparent 1px)",
          backgroundSize: "68px 68px",
          maskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black, transparent 75%)",
        }}
      />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center rounded-2xl px-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-ink-600 bg-ink-800/70 text-brand-300">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-mist-100">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-mist-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
