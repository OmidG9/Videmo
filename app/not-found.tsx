import Link from "next/link";
import { AuroraBackdrop, BrandLockup } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <AuroraBackdrop />

      <header className="px-6 py-7">
        <BrandLockup href="/" />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="max-w-md text-center">
          <p className="font-mono text-sm text-brand-300">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-mist-100">
            That page is not here
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mist-400">
            The video may have been deleted, or the link points somewhere that no longer exists.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/library">
              <Button size="lg">Go to library</Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="secondary">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
