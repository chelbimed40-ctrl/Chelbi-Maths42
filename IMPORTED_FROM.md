# Imported from

This codebase is a verbatim copy of **`chelbimed40-ctrl/Chelbi-Maths`**.

| | |
| --- | --- |
| Source repo | https://github.com/chelbimed40-ctrl/Chelbi-Maths |
| Commit | `a8f8f0de01d5e5edc2adfcc5c2e6b10520df3308` ("Add files via upload") |
| Files | 84 |
| Imported | 2026-11-11, branch `arena/26c537ba-chelbi-maths42` |

No application code, page, component, style, string or route was rewritten during the
import. The only files removed in this commit are the throwaway Express API that previously
lived in this repo (`src/app.ts`, `src/db.ts`, `src/schema.ts`, `src/migrate.ts`,
`src/server.ts`, `scripts/verify.mjs`), which never shipped anywhere.

To re-sync with upstream:

```bash
git remote add upstream https://github.com/chelbimed40-ctrl/Chelbi-Maths.git
git fetch upstream && git log --oneline upstream/main -1
```
