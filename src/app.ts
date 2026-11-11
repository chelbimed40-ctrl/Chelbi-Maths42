import express, { type Request, type Response, type NextFunction } from "express";
import type pg from "pg";

type Pool = pg.Pool;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Express 5 types params as string | string[]; ids are always single-valued here. */
const idOf = (req: Request): string => {
  const raw = req.params.id;
  return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
};

function badRequest(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function createApp(pool: Pool) {
  const app = express();
  app.use(express.json({ limit: "64kb" }));

  // --- health: proves the connection is alive -------------------------------
  app.get("/health", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const started = Date.now();
      const info = await pool.query("select version() as version, current_database() as db");
      const counts = await pool.query(
        "select (select count(*) from exercises) as exercises, (select count(*) from attempts) as attempts",
      );
      const rows = info.rows as Array<{ version: string; db: string }>;
      res.json({
        status: "ok",
        database: rows[0]?.db ?? null,
        server: rows[0]?.version.split(" ").slice(0, 2).join(" "),
        latencyMs: Date.now() - started,
        tables: {
          exercises: Number((counts.rows[0] as { exercises?: string } | undefined)?.exercises ?? 0),
          attempts: Number((counts.rows[0] as { attempts?: string } | undefined)?.attempts ?? 0),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // --- exercises: save ------------------------------------------------------
  app.post("/exercises", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
      const answer = num(req.body?.answer);
      const level = num(req.body?.level) ?? 1;
      if (!prompt) return badRequest(res, "prompt is required");
      if (answer === null) return badRequest(res, "answer must be a number");
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        return badRequest(res, "level must be an integer between 1 and 5");
      }
      const { rows } = await pool.query(
        `insert into exercises (prompt, answer, level) values ($1, $2, $3)
         returning id, prompt, answer::float8 as answer, level, created_at`,
        [prompt, answer, level],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  // --- exercises: retrieve --------------------------------------------------
  app.get("/exercises", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Math.max(num(req.query.limit) ?? 20, 1), 100);
      const { rows } = await pool.query(
        `select id, prompt, answer::float8 as answer, level, created_at
           from exercises order by created_at desc limit $1`,
        [limit],
      );
      res.json({ count: rows.length, items: rows });
    } catch (err) {
      next(err);
    }
  });

  app.get("/exercises/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!UUID_RE.test(idOf(req))) return badRequest(res, "invalid id");
      const { rows } = await pool.query(
        `select id, prompt, answer::float8 as answer, level, created_at
           from exercises where id = $1`,
        [idOf(req)],
      );
      if (!rows.length) return void res.status(404).json({ error: "not found" });
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  // --- attempts: save + grade ----------------------------------------------
  app.post("/exercises/:id/attempts", async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!UUID_RE.test(idOf(req))) return badRequest(res, "invalid id");
      const given = num(req.body?.answer);
      if (given === null) return badRequest(res, "answer must be a number");
      const { rows: found } = await pool.query<{ answer: string }>(
        "select answer from exercises where id = $1",
        [idOf(req)],
      );
      if (!found.length) return void res.status(404).json({ error: "exercise not found" });
      const correct = Number(found[0]!.answer) === given;
      const { rows } = await pool.query(
        `insert into attempts (exercise_id, given, correct) values ($1, $2, $3)
         returning id, exercise_id, given::float8 as given, correct, created_at`,
        [idOf(req), given, correct],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  app.get("/exercises/:id/attempts", async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!UUID_RE.test(idOf(req))) return badRequest(res, "invalid id");
      const { rows } = await pool.query(
        `select id, exercise_id, given::float8 as given, correct, created_at
           from attempts where exercise_id = $1 order by created_at desc`,
        [idOf(req)],
      );
      res.json({ count: rows.length, items: rows });
    } catch (err) {
      next(err);
    }
  });

  app.use((_req, res) => res.status(404).json({ error: "not found" }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[api]", err.message);
    res.status(503).json({ error: "database request failed", detail: err.message });
  });

  return app;
}
