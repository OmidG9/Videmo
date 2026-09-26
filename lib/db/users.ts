import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./index";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
  last_login_at: number | null;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: number;
  lastLoginAt: number | null;
};

const BCRYPT_ROUNDS = 12;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export function findUserByEmail(email: string): UserRow | undefined {
  return getDb()
    .prepare<[string], UserRow>(
      "SELECT * FROM users WHERE email = ? COLLATE NOCASE",
    )
    .get(normalizeEmail(email));
}

export function findUserById(id: string): UserRow | undefined {
  return getDb().prepare<[string], UserRow>("SELECT * FROM users WHERE id = ?").get(id);
}

export function countUsers(): number {
  return getDb().prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM users").get()!.n;
}

export function createUser(input: {
  email: string;
  name: string;
  password: string;
}): PublicUser {
  const now = Date.now();
  const row: UserRow = {
    id: randomUUID(),
    email: normalizeEmail(input.email),
    name: input.name.trim(),
    password_hash: bcrypt.hashSync(input.password, BCRYPT_ROUNDS),
    created_at: now,
    updated_at: now,
    last_login_at: null,
  };

  getDb()
    .prepare(
      `INSERT INTO users (id, email, name, password_hash, created_at, updated_at, last_login_at)
       VALUES (@id, @email, @name, @password_hash, @created_at, @updated_at, @last_login_at)`,
    )
    .run(row);

  return toPublicUser(row);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export function touchLastLogin(id: string): void {
  getDb()
    .prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
    .run(Date.now(), id);
}
