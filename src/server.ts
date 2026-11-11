import { createApp } from "./app";
import { createPool } from "./db";

const port = Number(process.env.PORT ?? 3000);
const pool = createPool();
const app = createApp(pool);

const server = app.listen(port, "0.0.0.0", () => {
  const host = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : "(unset)";
  console.log(`▲ listening on http://0.0.0.0:${port}  ·  db=${host}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, closing pool...`);
  server.close();
  await pool.end().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
