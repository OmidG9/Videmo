"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/providers/tooltip-provider";
import { ToastProvider } from "@/components/providers/toast-provider";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ToastProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
