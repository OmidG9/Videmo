"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/field";
import { useToast } from "@/components/providers/toast-provider";
import { MAX_PASSWORD_LENGTH, passwordStrength } from "@/lib/validation";

type Errors = { email?: string; password?: string; form?: string };

const ERROR_COPY: Record<string, string> = {
  CredentialsSignin: "That email and password combination doesn't match an account.",
  AccessDenied: "You don't have access to that page.",
  SessionRequired: "Please sign in to continue.",
  Configuration: "Authentication is misconfigured on the server.",
  OAuthAccountNotLinked: "Use the same email you signed up with.",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  const callbackUrl = params.get("callbackUrl") || "/library";
  const strength = passwordStrength(password);

  function validate(): Errors {
    const next: Errors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    else if (password.length > MAX_PASSWORD_LENGTH)
      next.password = "Password is too long";
    return next;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPending(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        const message =
          ERROR_COPY[result.error] ?? "Sign in failed. Please try again.";
        setErrors({ form: message });
        return;
      }

      if (result?.ok) {
        toast({ title: "Signed in", variant: "success" });
        // Refresh so server components re-read the new session cookie.
        router.replace(callbackUrl);
        router.refresh();
        return;
      }

      setErrors({ form: "Sign in failed. Please try again." });
    } catch {
      setErrors({ form: "Network error. Check the server and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-1">
      {errors.form && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-glow/40 bg-rose-glow/10 p-3.5 text-sm text-rose-glow"
        >
          <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4ZM10 14a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
              clipRule="evenodd"
            />
          </svg>
          <span>{errors.form}</span>
        </div>
      )}

      <Field label="Email" error={errors.email}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            disabled={pending}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
            }}
          />
        )}
      </Field>

      <Field
        label="Password"
        error={errors.password}
        trailing={
          password ? (
            <span className="text-[0.7rem] tabular-nums text-mist-500">
              {strength.label}
            </span>
          ) : null
        }
      >
        {({ id, describedBy, invalid }) => (
          <PasswordInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            disabled={pending}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
            }}
          />
        )}
      </Field>

      <Button type="submit" size="lg" loading={pending} className="mt-5 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="pt-4 text-center text-xs text-mist-500">
        Protected by rate limiting ·{" "}
        <Link href="/register" className="text-mist-400 underline-offset-2 hover:underline">
          create an account
        </Link>
      </p>
    </form>
  );
}
