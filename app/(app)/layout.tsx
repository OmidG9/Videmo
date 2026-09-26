import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { countUsers } from "@/lib/db/users";
import { MAX_UPLOAD_BYTES } from "@/lib/video-formats";
import { AppShell } from "@/components/app/app-shell";
import { AuroraBackdrop } from "@/components/ui/brand";

export const metadata: Metadata = {
  title: { default: "Library", template: "%s · Videmo" },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AuroraBackdrop />
      <AppShell user={user} memberCount={countUsers()} maxUploadBytes={MAX_UPLOAD_BYTES} />
      <main className="mx-auto w-full max-w-[92rem] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
