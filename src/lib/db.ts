// Shared database utilities.
//
// `withDbRetry` makes reads resilient to serverless-Postgres cold starts. On a
// service like Neon's free tier, the database sleeps after being idle and can
// take several seconds to wake; the first query (or the start of a
// `$transaction`) can then fail transiently — most often P2028 ("Unable to
// start a transaction in the given time") or a connection error — before the
// instance is ready. Retrying briefly lets that first request succeed once the
// database is awake.

// Prisma error codes worth retrying on a cold start. Auth errors (P1000) are
// deliberately excluded — bad credentials will never succeed on retry.
const RETRYABLE_DB_CODES = new Set(["P2028", "P1001", "P1002", "P1008", "P1017"]);

function isRetryableDbError(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string" && RETRYABLE_DB_CODES.has(code)) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /unable to start a transaction|can't reach database|timed out|connection|econnreset|terminating connection/i.test(
    message
  );
}

/**
 * Run a database operation, retrying a few times with exponential backoff if it
 * fails with a transient cold-start error. Non-retryable errors (and the final
 * attempt) are re-thrown unchanged, so real problems still surface.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  attempts = 4
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !isRetryableDbError(error)) break;
      // Backoff: 500ms, 1000ms, 2000ms — giving a sleeping DB time to wake.
      const delay = 500 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
