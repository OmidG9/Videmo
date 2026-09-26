import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { findUserById } from "@/lib/db/users";

/** De-duplicated per request so many server components share one session read. */
export const getSession = cache(() => getServerSession(authOptions));

/**
 * A signed JWT is not proof the account still exists: the row can be deleted,
 * or the database reset out from under a live cookie. Trusting the token alone
 * turns every write into a `SQLITE_CONSTRAINT_FOREIGNKEY` 500, so we confirm
 * the account on the way through. The lookup is de-duplicated per request.
 */
export const getVerifiedUser = cache(async () => {
  const session = await getSession();
  const id = session?.user?.id;
  if (!id) return null;

  const account = findUserById(id);
  if (!account) return null;

  return {
    id: account.id,
    name: account.name,
    email: account.email,
  };
});

export const UNAUTHORIZED = { error: "Unauthorized" } as const;
export const STALE_SESSION = {
  error: "Your session is no longer valid. Please sign in again.",
} as const;

/** For pages that require a signed-in user. Redirects when anonymous. */
export async function requireUser(): Promise<{ id: string; name: string; email: string }> {
  const session = await getSession();
  const id = session?.user?.id;

  if (!id) redirect("/login");

  const account = findUserById(id);
  // The token is well-formed but the account is gone: drop the cookie instead
  // of redirecting to /login, which the proxy would bounce straight back here.
  if (!account) redirect("/api/auth/recover");

  return { id: account.id, name: account.name, email: account.email };
}
