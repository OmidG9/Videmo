/**
 * Validated environment access. Fails loudly and early instead of letting
 * NextAuth throw an opaque `NO_SECRET` at request time.
 */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value || value.length < 8) {
    throw new Error(
      `[config] Missing or too-short environment variable ${name}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const env = {
  get authSecret() {
    return required("NEXTAUTH_SECRET");
  },
  get authUrl() {
    return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};

/** Throws only in production; in dev we fall back so `npm run dev` just works. */
export function getAuthSecret(): string {
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 8) {
    return process.env.NEXTAUTH_SECRET;
  }
  if (env.isProduction) required("NEXTAUTH_SECRET");
  return "videmo-development-only-secret-do-not-use-in-prod";
}
