import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Videmo library.",
};

const HIGHLIGHTS = [
  { title: "Private by default", body: "Every file stays on your disk, behind your session." },
  { title: "Zero setup", body: "SQLite creates itself on first run. No server, no cloud." },
  { title: "Resume anywhere", body: "Playback position is saved per video, per account." },
];

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <section className="surface rounded-2xl p-7 shadow-card sm:p-8">
        <div className="mb-7">
          <h1 className="text-2xl font-semibold tracking-tight text-mist-100">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-mist-400">
            Sign in to reach your library.
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 border-t border-ink-700/70 pt-5 text-center text-sm text-mist-400">
          No account yet?{" "}
          <Link
            href="/register"
            className="font-medium text-brand-300 transition-colors hover:text-brand-200"
          >
            Create one
          </Link>
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <div key={item.title} className="rounded-xl border border-ink-700/60 bg-ink-850/50 p-4">
            <p className="text-[0.8rem] font-semibold text-mist-200">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-mist-500">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
