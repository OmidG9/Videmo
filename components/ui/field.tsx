"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";

const CONTROL =
  "w-full rounded-xl border bg-ink-900/70 px-3.5 text-sm text-mist-100 placeholder:text-mist-500 " +
  "transition-all duration-200 outline-none " +
  "focus:border-brand-400/70 focus:bg-ink-900 focus:ring-4 focus:ring-brand-500/15 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function borderTone(invalid: boolean) {
  return invalid
    ? "border-rose-glow/60 focus:border-rose-glow/80 focus:ring-rose-glow/15"
    : "border-ink-600 hover:border-ink-500";
}

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  trailing?: ReactNode;
};

export function Field({ label, hint, error, children, trailing }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-mist-200">
          {label}
        </label>
        {trailing}
      </div>

      {children({ id, describedBy, invalid: Boolean(error) })}

      <div className="min-h-[1.125rem]">
        {error ? (
          <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs text-rose-glow">
            <svg viewBox="0 0 20 20" className="mt-px size-3.5 shrink-0" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4ZM10 14a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-mist-500">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function Input({
  invalid,
  className = "",
  ...rest
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} h-11 ${borderTone(Boolean(invalid))} ${className}`}
    />
  );
}

export function Textarea({
  invalid,
  className = "",
  ...rest
}: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} min-h-24 resize-y py-2.5 leading-relaxed ${borderTone(Boolean(invalid))} ${className}`}
    />
  );
}

type PasswordInputProps = ComponentProps<"input"> & {
  invalid?: boolean;
  revealable?: boolean;
};

export function PasswordInput({ invalid, revealable = true, className = "", ...rest }: PasswordInputProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative">
      <input
        {...rest}
        type={revealed ? "text" : "password"}
        aria-invalid={invalid || undefined}
        className={`${CONTROL} h-11 pr-11 font-mono tracking-wide ${borderTone(Boolean(invalid))} ${className}`}
      />
      {revealable && (
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-mist-500 transition-colors hover:text-mist-200"
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.3 4.1M6.3 7.8A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.8-.5" />
      <path d="M10 10a2.8 2.8 0 0 0 4 4M3 3l18 18" strokeLinecap="round" />
    </svg>
  );
}
