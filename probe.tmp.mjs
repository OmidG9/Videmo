import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const jar = new Map();

function save(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    redirect: "manual",
    headers: { ...(options.headers ?? {}), cookie: cookieHeader() },
  });
  save(res);
  return res;
}

const bytes = readFileSync("C:/Users/user/AppData/Local/Temp/opencode/videmo-test/sample.mp4");
const jpeg =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

const cs = await (await req("/api/auth/csrf")).json();
await req("/api/auth/callback/credentials", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    csrfToken: cs.csrfToken,
    email: "demo@videmo.local",
    password: "Videmo123",
    json: "true",
  }).toString(),
});

const form = new FormData();
form.append("file", new Blob([bytes], { type: "video/mp4" }), "poster-check.mp4");
form.append("title", "Poster Check");
form.append("thumbnail", jpeg);
const upload = await req("/api/videos/upload", { method: "POST", body: form });
const { video } = await upload.json();
console.log("uploaded", video.id);

for (const [label, path] of [
  ["grid  ", "/library"],
  ["list  ", "/library?layout=list"],
  ["watch ", `/watch/${video.id}`],
]) {
  const page = await req(path);
  const html = await page.text();
  const marker = `/api/videos/${video.id}/thumbnail`;
  const has = html.includes(marker);
  console.log(`\n${label} ${path} -> ${page.status}, thumbnail referenced: ${has}`);
  if (!has) continue;

  const idx = html.indexOf(marker);
  // Walk back to the opening tag of the wrapper that contains the img.
  const before = html.slice(0, idx);
  const openIdx = before.lastIndexOf("<div") >= 0
    ? Math.max(before.lastIndexOf("<div"), before.lastIndexOf("<a "), before.lastIndexOf("<span"))
    : idx;
  const wrapper = html.slice(openIdx, idx).replace(/></g, ">\n<");
  console.log("  wrapper markup:");
  for (const line of wrapper.split("\n").slice(0, 4)) console.log("    " + line);
  const imgTag = html.slice(idx - 400, idx).match(/<img[^>]*$/)?.[0] ?? "";
  const cls = imgTag.match(/class="([^"]*)"/)?.[1] ?? "?";
  console.log("  img classes:", cls);
  console.log("  wrapper has aspect-video:", /class="[^"]*aspect-video/.test(wrapper));
  console.log("  img is out of flow (absolute):", /style="[^"]*position:absolute/.test(imgTag));
}

await req(`/api/videos/${video.id}`, { method: "DELETE" });
console.log("\ncleaned up");
