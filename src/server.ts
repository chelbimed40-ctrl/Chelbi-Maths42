import { createApp } from "./app";
import { appConnectionString, createPool } from "./db";

const port = Number(process.env.PORT ?? 3000);

let pool;
try {
  const url = appConnectionString();
  pool = createPool(url);
  console.log(`▲ listening on http://0.0.0.0:${port}  ·  db=${new URL(url).hostname}`);
} catch (err) {
  console.error(`✖ ${(err as Error).message}`);
  console.error("  Run `neon deploy` (writes .env.local), or see README.md.");
  process.exit(1);
}

const app = createApp(pool);
const server = app.listen(port, "0.0.0.0");

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, closing pool...`);
  server.close();
  await pool!.end().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
