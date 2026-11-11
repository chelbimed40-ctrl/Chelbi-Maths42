/**
 * Schema for Chelbi-Maths42.
 * Kept as a TS string so `tsc` output is self-contained (no asset copying).
 * Applied by `npm run migrate` inside a single transaction.
 */
export const SCHEMA_SQL = `
-- gen_random_uuid() is in PostgreSQL core (13+), so no extension is needed.
create table if not exists exercises (
  id         uuid primary key default gen_random_uuid(),
  prompt     text        not null check (length(trim(prompt)) > 0),
  answer     numeric     not null,
  level      smallint    not null default 1 check (level between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists attempts (
  id         uuid primary key default gen_random_uuid(),
  exercise_id uuid     not null references exercises (id) on delete cascade,
  given      numeric   not null,
  correct    boolean   not null,
  created_at timestamptz not null default now()
);

create index if not exists attempts_exercise_id_created_at_idx
  on attempts (exercise_id, created_at desc);

create index if not exists exercises_created_at_idx
  on exercises (created_at desc);
`;
