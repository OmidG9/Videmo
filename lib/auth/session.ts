import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

/** De-duplicated per request so many server components share one session read. */
export const getSession = cache(() => getServerSession(authOptions));

/** For pages that require a signed-in user. Redirects when anonymous. */
export async function requireUser(): Promise<{ id: string; name: string; email: string }> {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) redirect("/login");
  return {
    id: user.id,
    name: user.name ?? "Viewer",
    email: user.email ?? "",
  };
}
