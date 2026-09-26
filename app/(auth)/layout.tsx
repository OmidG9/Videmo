import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AuroraBackdrop, BrandLockup } from "@/components/ui/brand";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.user?.id) redirect("/library");

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AuroraBackdrop />

      <header className="px-6 py-7">
        <BrandLockup href="/login" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
        <div className="w-full max-w-md animate-fade-up">{children}</div>
      </main>

      <footer className="px-6 pb-8 text-center text-xs leading-relaxed text-mist-500">
        Stored locally in SQLite. Nothing leaves this machine.
      </footer>
    </div>
  );
}
