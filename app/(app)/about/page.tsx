import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { countUsers } from "@/lib/db/users";
import { listVideos } from "@/lib/db/videos";
import { formatBytes, formatTime } from "@/lib/format";
import { DATA_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "About" };

const STACK = [
  ["Framework", "Next.js 16 (App Router, React 19)"],
  ["Styling", "Tailwind CSS 4 with a custom token theme"],
  ["Auth", "NextAuth credentials + JWT, bcrypt cost 12"],
  ["Database", "SQLite via better-sqlite3 (WAL mode)"],
  ["Validation", "Zod, shared between client and server"],
  ["Media", "HTML5 video with byte-range streaming"],
];

export default async function AboutPage() {
  const user = await requireUser();
  const videos = listVideos(user.id, { sort: "newest" });

  const totalBytes = videos.reduce((sum, video) => sum + video.sizeBytes, 0);
  const totalSeconds = videos.reduce((sum, video) => sum + video.duration, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-mist-100 sm:text-3xl">
          About this install
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-mist-400">
          Videmo is a self-contained video library. Accounts, metadata and watch progress live in a
          single SQLite file next to your media, so the app runs with no database server, no cloud
          storage and no external services.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Accounts", String(countUsers())],
          ["Videos", String(videos.length)],
          ["On disk", formatBytes(totalBytes)],
          ["Runtime", formatTime(totalSeconds)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-ink-700/60 bg-ink-850/50 px-4 py-3.5">
            <p className="text-lg font-semibold tabular-nums text-mist-100">{value}</p>
            <p className="mt-0.5 text-[0.7rem] uppercase tracking-wider text-mist-500">{label}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-mist-400">Stack</h2>
        <dl className="mt-3 divide-y divide-ink-800 overflow-hidden rounded-xl border border-ink-700/60">
          {STACK.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 bg-ink-850/40 px-4 py-3">
              <dt className="text-sm text-mist-400">{label}</dt>
              <dd className="text-right font-mono text-xs text-mist-200">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-mist-400">Storage</h2>
        <p className="mt-3 rounded-xl border border-ink-700/60 bg-ink-850/40 p-4 font-mono text-xs leading-relaxed text-mist-300">
          {DATA_DIR}
          <br />
          <span className="text-mist-500">videmo.db · uploads/ · thumbs/</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-mist-500">
          Back up that one directory and everything moves with it. Set{" "}
          <code className="font-mono text-mist-400">VIDEMO_DATA_DIR</code> to relocate it.
        </p>
      </section>

      <section className="rounded-xl border border-amber-glow/25 bg-amber-glow/8 p-4">
        <h2 className="text-sm font-semibold text-amber-glow">Heads up</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-mist-300">
          Rate limiting lives in process memory, so it resets when the server restarts and is not
          shared between instances. Back up <code className="font-mono">data/videmo.db</code> before
          deleting videos — deletes are permanent.
        </p>
      </section>
    </div>
  );
}
