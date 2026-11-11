import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Single server-side pool. Never import this module from a Client Component:
 * `server-only` makes any such import a build error, so DATABASE_URL can never
 * be pulled into a browser bundle.
 *
 * Driver choice: `pg` (node-postgres) with drizzle-orm/node-postgres is correct
 * for Next.js route handlers running on the Node runtime — one pool is reused
 * across requests and across HMR reloads. The @neondatabase/serverless
 * HTTP/WebSocket driver is only needed on edge runtimes.
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

function isLocalHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    // Neon requires TLS. The pooler presents a publicly trusted certificate.
    ssl: isLocalHost(databaseUrl) ? false : { rejectUnauthorized: true },
    // Neon suspends compute when idle; waking takes a few seconds.
    connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS ?? 15_000),
    idleTimeoutMillis: Number(process.env.PGIDLE_TIMEOUT_MS ?? 30_000),
    max: Number(process.env.PGPOOL_MAX ?? 5),
    keepAlive: true,
  });

pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
