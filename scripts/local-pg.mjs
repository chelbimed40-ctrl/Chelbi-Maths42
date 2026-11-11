/**
 * DEV ONLY — a local PostgreSQL-wire-protocol server backed by PGlite (real
 * Postgres compiled to WASM). It exists so the app's `pg` code path can be
 * exercised end to end on a machine that cannot reach a real Neon endpoint.
 *
 *   node scripts/local-pg.mjs            # listens on 127.0.0.1:55432
 *
 * It is NOT Neon and must never be used in production.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.LOCAL_PG_PORT ?? 55432);
const dataDir = process.env.LOCAL_PG_DATA ?? ".pgdata";

const db = await PGlite.create({ dataDir });
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
await server.start();
console.log(`local pg (pglite) listening on 127.0.0.1:${port} (dataDir=${dataDir})`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await server.stop().catch(() => {});
    await db.close().catch(() => {});
    process.exit(0);
  });
}
