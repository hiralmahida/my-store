// Prisma Client singleton.
//
// In development, Next.js hot-reloads your code on every save. If we created a
// `new PrismaClient()` (and a new pg connection pool) at module scope on every
// reload, we'd quickly exhaust the database's connections. To avoid that, we
// cache a single client on the Node.js `globalThis` object and reuse it — pool
// and all — across reloads. In production this file runs once, so it's a no-op.

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// `globalThis` is shared across module reloads, so we stash the client on it.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Build the pg pool config from DATABASE_URL.
//
// We configure TLS explicitly rather than through the connection string's
// `sslmode`/`channel_binding` params. `pg-connection-string` warns that
// `sslmode=require` is currently treated as an alias for `verify-full` (and
// this warning was surfacing as a Next.js error overlay). Stripping those
// params and passing an equivalent, fully-verified TLS config keeps the strong
// verification (Neon's certificate is signed by a public CA, so it validates)
// while silencing the warning. A small warm pool with keep-alive lets repeat
// queries reuse connections instead of reconnecting each time.
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and paste your Neon connection string."
    );
  }

  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");

  const adapter = new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true }, // verify the server certificate (no downgrade)
    max: 5,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });

  return new PrismaClient({
    adapter,
    // Log warnings/errors in dev for visibility; stay quiet in production.
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
