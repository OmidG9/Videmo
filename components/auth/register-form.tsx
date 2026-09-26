"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/field";
import { useToast } from "@/components/providers/toast-provider";
import { passwordStrength } from "@/lib/validation";

type Errors = Partial<Record<"name" | "email" | "password" | "confirmPassword" | "form", string>>;

const STRENGTH_BAR: Record<number, string> = {
  0: "bg-ink-600",
  1: "bg-rose-glow",
  2: "bg-amber-glow",
  3: "bg-aqua-400",
  4: "bg-mint-glow",
};

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  const strength = useMemo(() => passwordStrength(values.password), [values.password]);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};
    const name = values.name.trim();
    const email = values.email.trim();

    if (name.length < 2) next.name = "Use at least 2 characters";
    else if (name.length > 60) next.name = "Use at most 60 characters";

    if (!email) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) next.email = "Enter a valid email address";

    const password = values.password;
    if (password.length < 8) next.password = "Use at least 8 characters";
    else if (!/[a-z]/.test(password)) next.password = "Add a lowercase letter";
    else if (!/[A-Z]/.test(password)) next.password = "Add an uppercase letter";
    else if (!/\d/.test(password)) next.password = "Add a number";

    if (!values.confirmPassword) next.confirmPassword = "Confirm your password";
    else if (values.confirmPassword !== password) next.confirmPassword = "Passwords do not match";

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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.field) setErrors({ [data.field]: data.error });
        else setErrors({ form: data.error ?? "Could not create the account" });
        return;
      }

      // Account exists — establish the session immediately.
      const result = await signIn("credentials", {
        email: values.email.trim(),
        password: values.password,
        redirect: false,
      });

      if (!result?.ok) {
        toast({
          title: "Account created",
          description: "Sign in with your new credentials.",
          variant: "success",
        });
        router.replace("/login");
        return;
      }

      toast({ title: "Account created", description: "Welcome to Videmo.", variant: "success" });
      router.replace("/library");
      router.refresh();
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
          className="mb-5 rounded-xl border border-rose-glow/40 bg-rose-glow/10 p-3.5 text-sm text-rose-glow"
        >
          {errors.form}
        </div>
      )}

      <Field label="Display name" error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            name="name"
            autoComplete="name"
            placeholder="Alex Rivera"
            value={values.name}
            disabled={pending}
            onChange={(e) => set("name", e.target.value)}
          />
        )}
      </Field>

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
            value={values.email}
            disabled={pending}
            onChange={(e) => set("email", e.target.value)}
          />
        )}
      </Field>

      <Field
        label="Password"
        error={errors.password}
        hint="At least 8 characters with upper, lower and a number."
      >
        {({ id, describedBy, invalid }) => (
          <PasswordInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={values.password}
            disabled={pending}
            onChange={(e) => set("password", e.target.value)}
          />
        )}
      </Field>

      {values.password && (
        <div className="-mt-1 mb-1 flex items-center gap-2" aria-hidden>
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  index < strength.score ? STRENGTH_BAR[strength.score] : "bg-ink-700"
                }`}
              />
            ))}
          </div>
          <span className="w-16 text-right text-[0.7rem] text-mist-500">{strength.label}</span>
        </div>
      )}

      <Field label="Confirm password" error={errors.confirmPassword}>
        {({ id, describedBy, invalid }) => (
          <PasswordInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            value={values.confirmPassword}
            disabled={pending}
            onChange={(e) => set("confirmPassword", e.target.value)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" loading={pending} className="mt-5 w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="pt-4 text-center text-xs leading-relaxed text-mist-500">
        Passwords are hashed with bcrypt (cost 12) and never leave this machine.
      </p>
    </form>
  );
}
