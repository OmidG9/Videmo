/**
 * End-to-end smoke test. Requires a running server (npm run dev or npm start)
 * and a seeded account.
 *
 *   npm run seed
 *   npm run smoke
 *
 * Environment:
 *   BASE_URL   default http://localhost:3000
 *   SMOKE_EMAIL / SMOKE_PASSWORD   default to the seeded demo account
 *
 * Creates its own throwaway video and deletes it again, so the library is left
 * exactly as it was found.
 */
import { existsSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "demo@videmo.local";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "Videmo123";

let failures = 0;
const jar = new Map();

function saveCookies(res) {
  for (const cookie of res.headers.getSetCookie?.() ?? []) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    redirect: "manual",
    headers: { ...(options.headers ?? {}), cookie: cookieHeader() },
  });
  saveCookies(res);
  return res;
}

function log(label, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Builds a throwaway MP4-like buffer big enough to exercise range requests. */
function fakeVideo() {
  const size = 96 * 1024;
  const buffer = Buffer.alloc(size);
  buffer.writeUInt32BE(12, 0);
  buffer.write("ftypisom", 4);
  buffer.writeUInt32BE(size - 8, 12);
  buffer.write("mdat", 16);
  buffer.write("videmo-smoke", 24);
  buffer.write(String(randomUUID()), 64);
  return buffer;
}

/** A 1x1 red JPEG as a data URL — stands in for the browser-generated thumbnail. */
const TINY_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

/** A single ftyp box, enough for the server to accept it as an MP4. */
function bytes0() {
  const buffer = Buffer.alloc(2048);
  buffer.writeUInt32BE(12, 0);
  buffer.write("ftypisom", 4);
  return buffer;
}

async function main() {
  console.log(`\nVidemo smoke test → ${BASE}\n`);

  try {
    const health = await fetch(BASE + "/login");
    if (!health.ok) throw new Error(`server not reachable (${health.status})`);
  } catch (error) {
    console.error(`Cannot reach ${BASE}. Start the server first.\n${error.message}`);
    process.exit(1);
  }

  /* ------------------------- authentication ------------------------- */

  const anonList = await req("/api/videos");
  log("anonymous library access is rejected", anonList.status === 401, `status ${anonList.status}`);

  const anonStream = await req("/api/videos/none/stream");
  log("anonymous streaming is rejected", anonStream.status === 401, `status ${anonStream.status}`);

  const csrf = await (await req("/api/auth/csrf")).json();
  const loginForm = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email: EMAIL,
    password: PASSWORD,
    json: "true",
  });
  const login = await req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: loginForm.toString(),
  });
  const authed = jar.has("next-auth.session-token");
  log("login issues a session cookie", authed, `status ${login.status}`);

  if (!authed) {
    console.error(`\nCould not sign in as ${EMAIL}. Run \`npm run seed\` first.\n`);
    process.exit(1);
  }

  const session = await (await req("/api/auth/session")).json();
  log("session exposes a user id", Boolean(session?.user?.id), session?.user?.email ?? "no session");

  /* ------------------- session integrity guards --------------------- */

  // A well-formed JWT whose account no longer exists used to reach SQLite and
  // fail as a 500 FOREIGN KEY error. Anything untrustworthy must be a 401.
  const forged = new Map(jar);
  jar.set("next-auth.session-token", "forged.token.value");
  const forgedUpload = await req("/api/videos/upload", {
    method: "POST",
    body: (() => {
      const f = new FormData();
      f.append("file", new Blob([bytes0()], { type: "video/mp4" }), "forged.mp4");
      return f;
    })(),
  });
  log(
    "forged session cookie cannot write",
    forgedUpload.status === 401,
    `status ${forgedUpload.status}`,
  );

  for (const [k, v] of forged) jar.set(k, v);

  const recovery = await req("/api/auth/recover");
  const expired = (recovery.headers.getSetCookie?.() ?? []).some(
    (c) => /^next-auth\.session-token=/.test(c) && /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c),
  );
  log(
    "recovery route expires the session cookie",
    expired && String(recovery.headers.get("location")).endsWith("/login"),
    `${recovery.status} → ${recovery.headers.get("location")}`,
  );

  // Recovery signed us out; sign back in for the rest of the run.
  const cs2 = await (await req("/api/auth/csrf")).json();
  await req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken: cs2.csrfToken,
      email: EMAIL,
      password: PASSWORD,
      json: "true",
    }).toString(),
  });
  log("can sign back in after recovery", jar.has("next-auth.session-token"));

  /* ---------------------------- uploads ----------------------------- */

  const bytes = fakeVideo();
  const body = new FormData();
  body.append("file", new Blob([bytes], { type: "video/mp4" }), "smoke-test.mp4");
  body.append("title", "Smoke test clip");
  body.append("duration", "12");
  body.append("width", "1280");
  body.append("height", "720");
  body.append("thumbnail", TINY_JPEG);

  const upload = await req("/api/videos/upload", { method: "POST", body });
  const uploadJson = await upload.json().catch(() => ({}));
  const videoId = uploadJson?.video?.id;
  log("upload is accepted", upload.status === 201 && Boolean(videoId), uploadJson?.error ?? `status ${upload.status}`);

  if (!videoId) {
    console.error("\nAborting: upload failed, cannot test streaming.\n");
    process.exit(1);
  }

  try {
    const badBody = new FormData();
    badBody.append("file", new Blob([bytes], { type: "application/octet-stream" }), "payload.exe");
    const badUpload = await req("/api/videos/upload", { method: "POST", body: badBody });
    log("unsupported extension is rejected", badUpload.status === 415, `status ${badUpload.status}`);

    const list = await (await req("/api/videos?sort=title")).json();
    log("library lists the new video", list.videos.some((v) => v.id === videoId), `${list.videos.length} video(s)`);

    /* -------------------------- thumbnails -------------------------- */

    const thumbRes = await req(`/api/videos/${videoId}/thumbnail`);
    const thumbBytes = Buffer.from(await thumbRes.arrayBuffer());
    log(
      "thumbnail is served as a real JPEG",
      thumbRes.status === 200 &&
        thumbRes.headers.get("content-type") === "image/jpeg" &&
        thumbBytes.subarray(0, 2).toString("hex") === "ffd8" &&
        thumbBytes.subarray(-2).toString("hex") === "ffd9",
      `${thumbRes.status} ${thumbBytes.length}B`,
    );

    // A `fill` image is position:absolute and cannot give its wrapper height, so
    // the aspect ratio has to live on the wrapper. Getting this wrong renders
    // the thumbnail into a zero-height box: invisible, with no console error.
    const libraryHtml = await (await req("/library")).text();
    const marker = `/api/videos/${videoId}/thumbnail`;
    const at = libraryHtml.indexOf(marker);
    const wrapper = at === -1 ? "" : libraryHtml.slice(Math.max(0, at - 400), at);
    log(
      "library thumbnail sits in a sized wrapper",
      at !== -1 &&
        /class="[^"]*\baspect-video\b[^"]*"/.test(wrapper.slice(wrapper.lastIndexOf("<div"))) &&
        /<img[^>]*class="[^"]*\bsize-full\b/.test(wrapper.slice(wrapper.lastIndexOf("<img"))),
      at === -1 ? "no thumbnail in HTML" : "wrapper carries aspect-video, img is size-full",
    );

    const search = await (await req("/api/videos?q=smoke")).json();
    log("search filters the library", search.videos.length === 1, `${search.videos.length} match`);

    /* --------------------------- streaming -------------------------- */

    const full = await req(`/api/videos/${videoId}/stream`);
    const fullLength = (await full.arrayBuffer()).byteLength;
    log(
      "full stream returns every byte",
      full.status === 200 && fullLength === bytes.length,
      `${fullLength}/${bytes.length} bytes`,
    );

    const range = await req(`/api/videos/${videoId}/stream`, { headers: { Range: "bytes=0-1023" } });
    const rangeLength = (await range.arrayBuffer()).byteLength;
    log(
      "byte range returns 206 with the right slice",
      range.status === 206 &&
        rangeLength === 1024 &&
        range.headers.get("content-range") === `bytes 0-1023/${bytes.length}`,
      `${range.status} ${rangeLength}B ${range.headers.get("content-range")}`,
    );

    const suffix = await req(`/api/videos/${videoId}/stream`, { headers: { Range: "bytes=-500" } });
    const suffixLength = (await suffix.arrayBuffer()).byteLength;
    log("suffix range works", suffix.status === 206 && suffixLength === 500, `${suffix.status} ${suffixLength}B`);

    const unsatisfiable = await req(`/api/videos/${videoId}/stream`, {
      headers: { Range: `bytes=${bytes.length + 10}-` },
    });
    log("out-of-bounds range returns 416", unsatisfiable.status === 416, `status ${unsatisfiable.status}`);

    const head = await req(`/api/videos/${videoId}/stream`, { method: "HEAD" });
    log(
      "HEAD advertises size and range support",
      head.headers.get("content-length") === String(bytes.length) &&
        head.headers.get("accept-ranges") === "bytes",
      `${head.headers.get("content-length")} bytes`,
    );

    /* --------------------------- progress --------------------------- */

    const saved = await req(`/api/videos/${videoId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: 6, duration: 12 }),
    });
    const savedJson = await saved.json();
    log("watch position is stored", saved.status === 200 && savedJson.progress?.position === 6, JSON.stringify(savedJson.progress ?? savedJson));

    const read = await (await req(`/api/videos/${videoId}/progress`)).json();
    log("watch position is read back", read?.progress?.position === 6, `${read?.progress?.position}s`);

    const finished = await req(`/api/videos/${videoId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: 11.5, duration: 12 }),
    });
    const finishedJson = await finished.json();
    log("past 92% marks the video finished", finishedJson.progress?.completed === true, JSON.stringify(finishedJson.progress?.completed));

    const view = await req(`/api/videos/${videoId}/view`, { method: "POST" });
    const viewJson = await view.json();
    log("view counter increments", view.status === 200 && viewJson.counted === true, JSON.stringify(viewJson));

    /* ---------------------------- editing --------------------------- */

    const patch = await req(`/api/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Renamed by smoke test" }),
    });
    const patchJson = await patch.json();
    log("title can be edited", patch.status === 200 && patchJson.video?.title === "Renamed by smoke test", patchJson?.error ?? "");
  } finally {
    const removed = await req(`/api/videos/${videoId}`, { method: "DELETE" });
    log("delete returns 204", removed.status === 204, `status ${removed.status}`);

    const gone = await req(`/api/videos/${videoId}/stream`);
    log("stream is gone after delete", gone.status === 404, `status ${gone.status}`);

    const leftovers = existsSync("data/uploads")
      ? readdirSync("data/uploads").filter((f) => f.startsWith(videoId))
      : [];
    log("no orphaned files on disk", leftovers.length === 0, `${leftovers.length} leftover(s)`);
  }

  /* ------------------------------ pages ---------------------------- */

  const savedJar = new Map(jar);
  jar.clear();
  const anonPage = await req("/library");
  log(
    "signed-out /library redirects to /login",
    anonPage.status === 307 || anonPage.status === 302,
    `${anonPage.status} → ${anonPage.headers.get("location")}`,
  );
  for (const [k, v] of savedJar) jar.set(k, v);

  const library = await req("/library");
  const html = await library.text();
  log("signed-in /library renders", library.status === 200 && html.includes("Your library"), `status ${library.status}`);

  const missing = await req("/watch/00000000-0000-0000-0000-000000000000");
  log("unknown video returns 404", missing.status === 404, `status ${missing.status}`);

  console.log(
    failures === 0
      ? "\nAll checks passed.\n"
      : `\n${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
