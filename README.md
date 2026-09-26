# Videmo

A self-hosted video library with a built-in player. Upload files, browse them, and watch with
resume-where-you-left-off, keyboard shortcuts, speed control, and Picture-in-Picture.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, NextAuth, and SQLite.

> A full technical audit of the codebase — what was wrong, what changed, and what is still missing —
> lives in **[PROJECT_AUDIT.md](./PROJECT_AUDIT.md)**.

---

## Requirements

- Node.js 20.9+ (tested on 22.14)
- npm 10+

No database server, Docker, or ffmpeg needed. `better-sqlite3` is a native module, so a working
build toolchain for your platform is required (prebuilt binaries are downloaded automatically).

---

## Setup

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
```

Generate a session secret and paste it into `NEXTAUTH_SECRET` in `.env.local`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Create the database and a demo account:

```bash
npm run seed
```

```
created account
  email : demo@videmo.local
  pass  : Videmo123
```

Start the app:

```bash
npm run dev        # http://localhost:3000
```

For production:

```bash
npm run build
npm start
```

---

## Scripts

| Script | What it does |
| :--- | :--- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run check` | typecheck + lint |
| `npm run seed` | Create the demo account (idempotent) |
| `npm run smoke` | End-to-end smoke test — requires a running server |
| `npm run db:reset` | Delete `data/` entirely; the next run recreates it |

---

## Environment variables

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `NEXTAUTH_SECRET` | — | **Required.** Signs the session JWT (min 8 chars) |
| `NEXTAUTH_URL` | `http://localhost:3000` | Required in production. No trailing slash |
| `VIDEMO_DATA_DIR` | `./data` | Location of the SQLite file, `uploads/`, and `thumbs/` |
| `VIDEMO_MAX_UPLOAD_MB` | `1024` | Per-file upload limit in megabytes |

`.env.local`, `data/`, and `.next/` are git-ignored.

---

## Where data lives

```
data/
├── videmo.db        SQLite (WAL mode)
├── uploads/         original video files, <uuid>.<ext>
└── thumbs/          generated thumbnails, <uuid>.jpg
```

The `data/` directory is self-contained. Back it up by copying the folder; moving the whole
folder to another machine moves the library with it. Deleting it resets the app to a clean
install.

---

## Features

**Accounts** — SQLite-backed registration and sign-in, bcrypt password hashing (cost 12),
email normalization, rate-limited login and registration, generic auth errors, and
callback-aware redirects.

**Library** — grid and list layouts, live search, sorting by date/title/views, inline rename,
delete with confirmation, and empty/loading/error states.

**Upload** — drag or pick files, per-file progress bars, add-more, client-side duration/dimension
probing, and thumbnail generation in the browser with Canvas.

**Player** — click-and-drag timeline with buffered range, volume and mute, playback speed
(0.25×–2×), Picture-in-Picture, fullscreen, AirPlay detection, and keyboard shortcuts:

| Key | Action |
| :--- | :--- |
| `Space` / `K` | Play / pause |
| `J` / `L` | Back or forward 10 seconds |
| `←` / `→` | Seek 5 seconds |
| `↑` / `↓` | Volume up / down |
| `M` | Mute |
| `F` | Fullscreen |
| `P` | Picture-in-Picture |
| `N` / `,` | Next / previous in playlist |
| `0`–`9` | Jump to 0%–90% |
| `Home` / `End` | Jump to start / end |

**Resume** — position saves every 5 seconds and on unload, and the next video in the playlist
starts automatically when one ends.

**Streaming** — proper HTTP Range support (`206`, `Content-Range`, `Accept-Ranges`, suffix
ranges, `416`, `HEAD`), so seeking is instant and bandwidth is not wasted.

---

## Architecture

```
app/
├── (auth)/                  login + register, centred layout
├── (app)/                   library + watch + about, shared app shell
│   ├── library/             the main grid/list view
│   └── watch/[id]/          player, playlist, edit and delete
├── api/
│   ├── auth/                NextAuth handlers + registration
│   └── videos/              list, upload, stream, thumbnail, progress, view
├── error.tsx  not-found.tsx
└── page.tsx                 redirect only

lib/
├── db/                      schema + migrations, client, repositories
├── auth/                    NextAuth options, session helpers
├── security/                rate limiting
└── paths.ts env.ts validation.ts video-formats.ts video-sort.ts format.ts

components/
├── app/                     shell, sidebar, user menu
├── provider/                auth, toast, tooltip
├── ui/                      button, field, modal, brand
├── auth/                    login and register forms
├── library/                 library view, video card, upload dialog and hook
└── player/                  video player, timeline, icons, watch view

proxy.ts                     edge auth guard (Next 16's replacement for middleware.ts)
types/next-auth.d.ts         session type augmentation
```

Data flows one way: route handler → repository → SQLite. Components never touch the database.
Every video query is scoped to the signed-in user, so one account can never see another's files.

---

## Testing

```bash
npm run build
npm start          # in one terminal
npm run smoke      # in another
```

25 assertions covering auth, permissions, upload, HTTP Range behaviour, progress persistence,
view counting, editing, deletion, orphan cleanup, and page routing:

```
PASS  anonymous library access is rejected — status 401
PASS  byte range returns 206 with the right slice — 206 1024B bytes 0-1023/98304
PASS  out-of-bounds range returns 416 — status 416
PASS  watch position is stored
PASS  delete returns 204
PASS  no orphaned files on disk — 0 leftover(s)
...
All checks passed.
```

The smoke test creates its own video and deletes it again, so the library is left untouched.
It needs the seeded demo account — run `npm run seed` first.

---

## Known limitations

- Progressive MP4/WebM playback only — no HLS or adaptive bitrate for slow connections.
- Uploads are buffered in memory by `formData()`, so the 1 GB limit also bounds what a single
  request can use.
- Rate limiting is per-process and in-memory, so it stops working behind multiple instances.
  Authentication is single-user: no sharing, public links, or roles.
- Thumbnails are generated in the browser, so a file uploaded without a browser thumbnail falls
  back to a placeholder.
- `next-auth@4` is on the legacy line; Auth.js v5 is the planned upgrade.
- No unit tests or CI yet — see the remaining-work table in PROJECT_AUDIT.md.

---

## License

Private project. All rights reserved.
