import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Clears a session cookie that no longer maps to a real account, then sends the
 * visitor to the login page. Without this, `requireUser` would bounce between
 * /login and /library forever, because the proxy still sees a well-formed JWT.
 */
const SESSION_COOKIES = ["next-auth.session-token", "__Secure-next-auth.session-token"];

export async function GET(request: Request) {
  const jar = await cookies();
  for (const name of SESSION_COOKIES) {
    try {
      jar.delete(name);
    } catch {
      /* cookie absent for this scheme — nothing to clear */
    }
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
