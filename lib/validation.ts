import { z } from "zod";

export const MAX_PASSWORD_LENGTH = 128;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Enter a valid email address")
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(MAX_PASSWORD_LENGTH, `Use at most ${MAX_PASSWORD_LENGTH} characters`)
  .refine((v) => /[a-z]/.test(v), "Include a lowercase letter")
  .refine((v) => /[A-Z]/.test(v), "Include an uppercase letter")
  .refine((v) => /\d/.test(v), "Include a number");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Use at least 2 characters")
  .max(60, "Use at most 60 characters");

export const loginSchema = z.object({
  email: emailSchema,
  // Login only checks presence — complexity is enforced at registration.
  password: z.string().min(1, "Password is required").max(MAX_PASSWORD_LENGTH),
});

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const videoMetaSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140, "Title is too long"),
  description: z.string().trim().max(2000, "Description is too long").optional().default(""),
  duration: z.coerce.number().min(0).max(60 * 60 * 24).optional().default(0),
  width: z.coerce.number().int().min(0).max(16384).optional(),
  height: z.coerce.number().int().min(0).max(16384).optional(),
});

export const progressSchema = z.object({
  position: z.coerce.number().min(0).max(60 * 60 * 24 * 7),
  duration: z.coerce.number().min(0).max(60 * 60 * 24 * 7),
});

/** First error message, so the UI can show one clean field-level error. */
export function firstError(error: z.ZodError): {
  message: string;
  field?: string;
} {
  const issue = error.issues[0];
  if (!issue) return { message: "Invalid input" };
  return {
    message: issue.message,
    field: issue.path.length ? String(issue.path[0]) : undefined,
  };
}

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^\w\s]/.test(password)) score++;
  return {
    score: Math.min(4, score) as 0 | 1 | 2 | 3 | 4,
    label: ["Very weak", "Weak", "Fair", "Good", "Strong"][Math.min(4, score)],
  };
}
