import pg from "pg";
import { migrationConnectionString } from "./db";
import { SCHEMA_SQL } from "./schema";

/** Applies the schema over the direct (unpooled) connection. */
async function main(): Promise<void> {
  const client = new pg.Client({ connectionString: migrationConnectionString() });
  await client.connect();
  try {
    await client.query("begin");
    await client.query(SCHEMA_SQL);
    await client.query("commit");
    const { rows } = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
        order by table_name`,
    );
    console.log("✔ migration applied. tables:", rows.map((r) => r.table_name).join(", "));
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("✖ migration failed:", (err as Error).message);
  process.exit(1);
});
