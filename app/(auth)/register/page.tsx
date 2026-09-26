import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a local Videmo account.",
};

export default function RegisterPage() {
  return (
    <section className="surface animate-fade-up rounded-2xl p-7 shadow-card sm:p-8">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-mist-100">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-mist-400">
          Takes a few seconds. Your library starts empty.
        </p>
      </div>

      <RegisterForm />

      <p className="mt-6 border-t border-ink-700/70 pt-5 text-center text-sm text-mist-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-300 transition-colors hover:text-brand-200">
          Sign in
        </Link>
      </p>
    </section>
  );
}
