"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { initials } from "@/lib/format";
import { Spinner } from "@/components/ui/button";

type Props = {
  user: { id: string; name: string; email: string };
  memberCount: number;
};

export function UserMenu({ user, memberCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ redirect: false, callbackUrl: "/login" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-ink-700 bg-ink-800/70 py-1 pl-1 pr-3 transition-colors hover:border-ink-600 hover:bg-ink-700/70"
      >
        <span className="grid size-8 place-items-center rounded-full bg-linear-to-br from-brand-500 to-aqua-500 text-xs font-bold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden max-w-28 truncate text-sm font-medium text-mist-200 sm:block">
          {user.name}
        </span>
        <svg viewBox="0 0 20 20" className="size-3.5 text-mist-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="surface absolute right-0 top-12 z-50 w-64 animate-scale-in overflow-hidden rounded-xl p-1.5 shadow-2xl"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-mist-100">{user.name}</p>
            <p className="truncate text-xs text-mist-500">{user.email}</p>
          </div>

          <div className="my-1 h-px bg-ink-700/70" />

          <p className="px-3 py-1.5 text-[0.7rem] text-mist-500">
            {memberCount} {memberCount === 1 ? "account" : "accounts"} on this device
          </p>

          <div className="my-1 h-px bg-ink-700/70" />

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-glow transition-colors hover:bg-rose-glow/10 disabled:opacity-60"
          >
            {signingOut ? <Spinner className="size-4" /> : <SignOutIcon />}
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" strokeLinecap="round" />
      <path d="M10 8 6 12l4 4M6 12h9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
