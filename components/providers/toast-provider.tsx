"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastVariant = "success" | "error" | "info";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
};

type ToastInput = Omit<Partial<Toast>, "title"> & { title: string };

const ToastContext = createContext<{
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
} | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { ring: string; icon: string }> = {
  success: { ring: "border-mint-glow/40", icon: "text-mint-glow" },
  error: { ring: "border-rose-glow/45", icon: "text-rose-glow" },
  info: { ring: "border-brand-400/40", icon: "text-brand-300" },
};

const GLYPH: Record<ToastVariant, string> = { success: "✓", error: "!", info: "i" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      const next: Toast = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? "info",
        duration: input.duration ?? (input.variant === "error" ? 6000 : 3800),
      };
      setToasts((current) => [...current.slice(-3), next]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), next.duration),
      );
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex w-full max-w-sm animate-scale-in items-start gap-3 rounded-xl border bg-ink-850/95 p-3.5 shadow-card backdrop-blur-xl ${VARIANT_STYLES[item.variant].ring}`}
          >
            <span
              aria-hidden
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold ${VARIANT_STYLES[item.variant].icon}`}
            >
              {GLYPH[item.variant]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-mist-100">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-mist-400">
                  {item.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="-m-1 rounded-md p-1 text-mist-500 transition-colors hover:text-mist-100"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
