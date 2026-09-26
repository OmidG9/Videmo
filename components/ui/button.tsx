import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-linear-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-[0_10px_30px_-12px_rgb(139_92_246/0.9)] hover:shadow-[0_14px_38px_-12px_rgb(139_92_246/1)]",
  secondary:
    "text-mist-100 bg-ink-700/70 border border-ink-600 hover:bg-ink-600/70 hover:border-ink-500",
  ghost: "text-mist-300 hover:text-mist-100 hover:bg-ink-700/50",
  subtle: "text-mist-200 bg-ink-800/60 border border-ink-700/60 hover:bg-ink-700/60",
  danger:
    "text-white bg-rose-glow/90 hover:bg-rose-glow shadow-[0_10px_30px_-14px_rgb(244_63_94/0.9)]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[0.95rem] gap-2.5 rounded-xl",
  icon: "size-9 rounded-lg",
};

const BASE =
  "inline-flex select-none items-center justify-center font-medium transition-all duration-200 " +
  "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] whitespace-nowrap";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leadingIcon,
  trailingIcon,
  children,
  className = "",
  disabled,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <Spinner /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  children,
  className = "",
  ...rest
}: CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} {...rest} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </Link>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
