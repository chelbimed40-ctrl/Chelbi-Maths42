import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Same precedence as the app: `.env.local` (written by `neon deploy`) wins over `.env`.
// Already-exported process env always wins over both.
loadEnv({ path: [".env.local", ".env"], quiet: true });

/**
 * Credentials come from the environment only — nothing is hardcoded here.
 * `drizzle.config.json` used to pin postgres:postgres@127.0.0.1 and must stay deleted.
 *
 * Migrations run against the DIRECT (unpooled) Neon endpoint when available:
 * DDL through the pooler is not supported by Neon.
 */
const fromEnv = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!fromEnv) {
  // `generate`/`check` never open a connection, so they must work offline.
  console.warn(
    "[drizzle] DATABASE_URL is not set — using a placeholder. " +
      "`migrate`/`push`/`studio` will fail until you run `neon deploy` or set it in .env.",
  );
}

const url = fromEnv ?? "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
