## Interaction

Be concise.

## Comments

Explain the why and non-obvious constraints; never restate the code.

## Architecture

Feature-based SPA. Dependencies point downward only:

`src/app`, `src/routes` → `src/features/<name>` → `src/components`, `src/lib`, `src/api`

Within the shared layers: `api` → `lib`; `components` → `lib`; `lib` reaches back into `components` only for the imperative `ui/toast` API. No other upward or sideways imports.

- `src/app` — router instance and provider tree; `main.tsx` only mounts it.
- `src/routes` — TanStack Router file routes. Thin: validate search, guard, load, render a feature component.
- `src/features/<name>` — one domain (`auth`, `board`, `colors`): `api.ts`, `components/`, `lib/`.
  `board` is a department's board — Trim and Accessories are two configs of it (`lib/boards.ts`).
- `src/components` — shared UI (`ui/` is shadcn, do not hand-edit styles), `theme/`, `router/` fallbacks.
- `src/lib` — non-UI infrastructure: pure helpers, session store, query client.
- `src/api` — HTTP client only; endpoints live in features.

## Code

- No compat layers, fallbacks or deprecated paths for internal refactors — delete the old path.
- Use what the dependencies already do when it is simpler than writing it yourself.

## Git

Commits and PRs in English. PR body follows `.github/PULL_REQUEST_TEMPLATE.md`, including when passing `--body` to `gh`.
