import pg from "pg";

/**
 * Connection strings written by `neon deploy` into .env.local:
 *   DATABASE_URL          - pooled (-pooler host)  -> application traffic
 *   DATABASE_URL_UNPOOLED - direct                 -> migrations, pg_dump, LISTEN/NOTIFY
 *
 * Per the neon-postgres skill: use the pooled string at runtime, the direct
 * string for schema migrations.
 */
export function appConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `neon deploy` (writes .env.local), or copy .env.example to .env and fill it in.",
    );
  }
  return url;
}

export function migrationConnectionString(): string {
  return process.env.DATABASE_URL_UNPOOLED ?? appConnectionString();
}

function isLocal(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

/**
 * `pg` (node-postgres) is the driver the neon-postgres skill recommends for
 * long-lived Node servers: a single pool reused across requests.
 * TLS is on for anything that is not loopback; Neon requires TLS.
 */
export function createPool(url: string = appConnectionString()): pg.Pool {
  const pool = new pg.Pool({
    connectionString: url,
    max: Number(process.env.PGPOOL_MAX ?? 5),
    ssl: isLocal(url) ? false : { rejectUnauthorized: true },
  });
  pool.on("error", (err) => {
    console.error("[db] idle client error:", err.message);
  });
  return pool;
}
