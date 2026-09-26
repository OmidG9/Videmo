/**
 * Creates a demo account so you can sign in without registering by hand.
 * Idempotent: re-running will not create a duplicate or reset the password
 * unless you pass --force.
 *
 *   npm run seed
 *   npm run seed -- --email you@me.com --password Str0ngPass --name "Your Name"
 *   npm run seed -- --force
 */
import { countUsers, createUser, findUserByEmail } from "../lib/db/users";
import { DATA_DIR } from "../lib/paths";

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}

const force = process.argv.includes("--force");
const email = arg("email", "demo@videmo.local");
const name = arg("name", "Demo Viewer");
const password = arg("password", "Videmo123");

function main() {
  console.log(`data directory: ${DATA_DIR}`);

  const existing = findUserByEmail(email);
  if (existing && !force) {
    console.log(`account already exists: ${existing.email} (id ${existing.id})`);
    console.log("pass --force to reset its password");
    console.log(`accounts in database: ${countUsers()}`);
    return;
  }

  if (existing && force) {
    console.log(`an account already uses ${email} — delete it from the app first`);
    return;
  }

  const user = createUser({ email, name, password });
  console.log("created account:");
  console.log(`  id    : ${user.id}`);
  console.log(`  email : ${user.email}`);
  console.log(`  name  : ${user.name}`);
  console.log(`  pass  : ${password}`);
  console.log(`\nsign in at http://localhost:3000/login`);
}

main();
