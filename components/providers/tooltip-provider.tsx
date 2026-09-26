"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

type TooltipContextValue = {
  show: (id: string, content: React.ReactNode) => void;
  hide: (id: string) => void;
  content: React.ReactNode;
  visibleId: string | null;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  const [tip, setTip] = useState<{ id: string; content: React.ReactNode } | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generatedId = useId();

  const show = useCallback((id: string, content: React.ReactNode) => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setTip({ id, content }), 380);
  }, []);

  const hide = useCallback((id: string) => {
    if (timeout.current) clearTimeout(timeout.current);
    setTip((current) => (current?.id === id ? null : current));
  }, []);

  const value = useMemo(
    () => ({ show, hide, content: tip?.content ?? null, visibleId: tip?.id ?? null }),
    [show, hide, tip],
  );

  return (
    <TooltipContext.Provider value={value}>
      {children}
      <span id={generatedId} hidden />
    </TooltipContext.Provider>
  );
}

export function useTooltip() {
  const context = useContext(TooltipContext);
  if (!context) throw new Error("useTooltip must be used inside <TooltipProvider>");
  return context;
}
