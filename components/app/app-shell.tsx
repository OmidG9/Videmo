"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLockup } from "@/components/ui/brand";
import { UserMenu } from "@/components/app/user-menu";
import { UploadButton } from "@/components/library/upload-button";

type Props = {
  user: { id: string; name: string; email: string };
  memberCount: number;
  /** Server-provided upload ceiling, see `useVideoUpload`. */
  maxUploadBytes?: number;
};

const NAV = [
  { href: "/library", label: "Library" },
  { href: "/watch", label: "Now playing" },
  { href: "/about", label: "About" },
];

export function AppShell({ user, memberCount, maxUploadBytes }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800/80 bg-ink-950/72 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[92rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLockup />

        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "text-mist-100" : "text-mist-400 hover:text-mist-200"
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-linear-to-r from-brand-400 to-aqua-400"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <UploadButton
            size="sm"
            maxBytes={maxUploadBytes}
            onUploaded={() => {
              router.refresh();
            }}
          />
          <UserMenu user={user} memberCount={memberCount} />
        </div>
      </div>
    </header>
  );
}
