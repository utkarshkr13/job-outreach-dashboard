# Contributing

## Setup

```bash
npm install
cp .env.example .env.local   # fill in what you have; leave the rest blank
npm run dev
```

Without any Notion/Gmail/Firebase/Anthropic credentials, set `NEXT_PUBLIC_APP_MODE=demo`
in `.env.local` — the app runs entirely against in-memory mock data (`lib/mockDb.ts`),
no external services required.

## Before opening a PR

```bash
npx tsc --noEmit     # must be clean
npm test             # must pass (Vitest, lib/**/*.test.ts)
npm run build         # must succeed (NEXT_PUBLIC_APP_MODE=demo npm run build if you have no real creds)
npm run lint          # currently has pre-existing debt (mostly no-explicit-any); please don't add *new* lint errors, but you don't need to fix unrelated ones in your PR
```

CI (`.github/workflows/ci.yml`) runs typecheck and build as blocking checks, and lint as
non-blocking (tracked separately as tech debt).

## Code conventions

- **API route error handling**: catch clauses should be typed as `unknown` (the TS default),
  not `any`. Use `getErrorMessage(e)` from `lib/errors.ts` to safely extract a message for
  logging, and `safeErrorBody(e)` / `safeErrorStatus(e)` from `lib/api-errors.ts` to build the
  client-facing response — never return `e.message` directly to the client (it can leak
  internal/provider error text).
- **External API calls** (Notion, Gmail, Anthropic/Groq): wrap with `withRetry` / `withTimeout`
  from `lib/retry.ts` where a transient failure is safe to retry. Do **not** retry the actual
  Gmail send — a retry after a successful-but-slow send would produce a visible duplicate
  email to a real recruiter.
- **Demo mode**: every route that touches Notion/Gmail/Firebase should have a
  `process.env.NEXT_PUBLIC_APP_MODE === 'demo'` branch backed by `lib/mockDb.ts`, so the app
  is fully testable without real credentials.
- **Notion schema**: don't invent new "Email Status" select values without checking
  `types/notion.ts` / `EmailStatus` first — adding an option that doesn't exist in a real
  user's Notion database can behave unexpectedly. Prefer reusing existing statuses.

## Testing

Unit tests live next to the code they test (`lib/foo.test.ts`) and run with Vitest
(`npm test`). Route handlers aren't unit-tested directly since they need real Notion/Gmail/
Anthropic credentials this environment doesn't have — test the `lib/` functions they call
instead.

## Reporting issues

Please include: what you expected, what happened, whether you were in demo mode or with
real credentials, and the relevant `console.error` output (server logs use the structured
logger in `lib/logger.ts`, which redacts anything that looks like a secret).
