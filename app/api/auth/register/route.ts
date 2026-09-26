import { NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/db/users";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { firstError, registerSchema } from "@/lib/validation";

const MAX_REGISTRATIONS = 5;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`register:${ip}`, MAX_REGISTRATIONS, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many accounts created from this device. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    const { message, field } = firstError(parsed.error);
    return NextResponse.json({ error: message, field }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  if (findUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with that email already exists", field: "email" },
      { status: 409 },
    );
  }

  const user = createUser({ name, email, password });

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
}
