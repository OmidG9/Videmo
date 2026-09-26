import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAuthSecret } from "@/lib/env";
import { clientIp, clearRateLimit, fakeDelay, rateLimit } from "@/lib/security/rate-limit";
import { findUserByEmail, touchLastLogin, verifyPassword } from "@/lib/db/users";
import { loginSchema } from "@/lib/validation";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

/**
 * A bcrypt hash compared against when the email is unknown, so a missing
 * account costs the same wall-clock time as a wrong password.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.tGCPGB6TJbX/5oWv3nQ0k0k0k0k0k0k";

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  jwt: { maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login", error: "/login", newUser: "/register" },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = clientIp(req);
        if (!rateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS).ok) return null;

        const parsed = loginSchema.safeParse(credentials ?? {});
        if (!parsed.success) {
          await fakeDelay(350);
          return null;
        }

        const { email, password } = parsed.data;
        const user = findUserByEmail(email);
        const ok = verifyPassword(password, user?.password_hash ?? DUMMY_HASH);

        if (!user || !ok) {
          await fakeDelay(250);
          return null;
        }

        clearRateLimit(`login:${ip}`);
        touchLastLogin(user.id);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user?.id) touchLastLogin(user.id);
    },
  },
  logger: {
    error(code, metadata) {
      // CredentialsSignin is an expected user error, not something to log loudly.
      if (code === "CredentialsSignin") return;
      console.error(`[auth] ${code}`, metadata);
    },
  },
};
