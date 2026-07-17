// Create (or promote) a real SUPERADMIN account — WITHOUT the demo seed.
//
// The demo seed (prisma/seed.ts) WIPES tables and inserts throwaway logins
// (admin@firststop.qa / admin1234, ...). Never run it against production. Use
// this instead to create your first real admin; credentials come from env vars
// so they never land in the repo. Idempotent: re-running updates the name +
// password and ensures the account is an enabled SUPERADMIN.
//
// Point DATABASE_URL at the target database (e.g. put your Neon pooled URL in
// .env.local), then run:
//
//   ADMIN_EMAIL="you@company.com" ADMIN_PASSWORD='a-long-strong-passphrase' \
//   ADMIN_NAME="Your Name" npm run admin:create
//
// Run via `tsx`, which (unlike the Next.js bundler) doesn't read the "@/..."
// path aliases — so we import with relative paths and load env ourselves,
// matching how the Prisma CLI loads it (.env then .env.local overriding).
import { config } from "dotenv";
config();
config({ path: ".env.local", override: true });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = (process.env.ADMIN_NAME ?? "").trim() || "Admin";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Set ADMIN_EMAIL to a valid email address.");
  }
  if (password.length < 12) {
    throw new Error(
      "Set ADMIN_PASSWORD to at least 12 characters — this is a real admin, choose a strong passphrase."
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Put your target DB URL in .env.local.");
  }

  // Configure TLS explicitly (same rationale as src/lib/prisma.ts): strip the
  // sslmode/channel_binding params and verify the server certificate.
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");

  const adapter = new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name, passwordHash, role: "SUPERADMIN" },
      update: { name, passwordHash, role: "SUPERADMIN", disabled: false },
    });
    console.log(`✅  SUPERADMIN ready: ${user.email} (${user.name}). Sign in at /login.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ ", error instanceof Error ? error.message : error);
  process.exit(1);
});
