# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Replit Database (`@replit/database` v2) — server-side KV store via `REPLIT_DB_URL`
- **Build**: esbuild (CJS bundle)

## Artifacts

### API Server (`artifacts/api-server`)
- **Port**: 8080 (proxied via `/api` prefix)
- **Database**: Replit KV via `@replit/database` (returns `{ok, value}` result objects — always unwrap)
- **Key schema**: `wso_session_ids` → `string[]`, `wso_session:{id}` → `Session` JSON
- **Routes**: `GET/POST /api/sessions`, `GET/PUT/DELETE /api/sessions/:id`

### Winner Stays On (`artifacts/football-wso`)
- **Type**: react-vite
- **Preview path**: `/`
- **Persistence**: Replit Database via Express API (no localStorage)
- **Description**: Mobile-first 3-team "winner stays on" football session manager
- **Routing**:
  - `/` → Sessions Hub (list all live + completed sessions)
  - `/create` → Create new session
  - `/match-setup/:id` → Pick starting teams
  - `/live/:id` → Live match (polls API every 3s for sync)
  - `/summary/:id` → End-of-session summary
- **Key files**:
  - `src/types.ts` — all TypeScript types
  - `src/lib/gameLogic.ts` — rotation, streak, stat computation (NEVER modify)
  - `src/lib/storage.ts` — async API client (replaces localStorage)
  - `src/pages/SessionsHub.tsx` — home page, lists all sessions
  - `src/pages/CreateSession.tsx` — session creation form
  - `src/pages/MatchSetup.tsx` — pick starting teams
  - `src/pages/LiveMatch.tsx` — live match with timer, results, 3s polling
  - `src/pages/SessionSummary.tsx` — end-of-session summary

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
