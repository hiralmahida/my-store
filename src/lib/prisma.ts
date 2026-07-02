// Prisma Client singleton.
//
// In development, Next.js hot-reloads your code on every save. If we created a
// `new PrismaClient()` at module scope, each reload would open a brand-new
// database connection and you'd quickly exhaust the connection pool
// ("too many connections" errors). To avoid that, we cache a single client on
// the Node.js `globalThis` object and reuse it across reloads.
//
// In production this file runs once, so the caching is a no-op there.

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7's client has no built-in database engine — it talks to Postgres
// through a "driver adapter". We use the node-postgres (`pg`) adapter, pointed
// at the DATABASE_URL from your .env file (Next.js loads .env automatically).
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and paste your Neon connection string."
  );
}
const adapter = new PrismaPg({ connectionString });

// `globalThis` is shared across module reloads, so we stash the client on it.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // Log warnings/errors in dev for visibility; stay quiet in production.
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
