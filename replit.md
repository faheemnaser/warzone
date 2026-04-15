# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Winner Stays On (`artifacts/football-wso`)
- **Type**: react-vite (frontend-only, no backend)
- **Preview path**: `/`
- **Persistence**: localStorage only
- **Description**: Mobile-first 3-team "winner stays on" football session manager
- **Features**:
  - Session creation with player management and team assignment
  - Match setup (random or manual team selection)
  - Live match screen with 7-minute countdown timer, team rotation, win/draw recording
  - Full game logic: wins, streaks, who came from rest
  - Match history with edit/delete and full state recalculation from history
  - Session summary with champion + streak highlight
- **Key files**:
  - `src/types.ts` — all TypeScript types
  - `src/lib/gameLogic.ts` — rotation, streak, and stat computation
  - `src/lib/storage.ts` — localStorage helpers
  - `src/pages/CreateSession.tsx` — session creation form
  - `src/pages/MatchSetup.tsx` — pick starting teams
  - `src/pages/LiveMatch.tsx` — live match with timer and result buttons
  - `src/pages/SessionSummary.tsx` — end-of-session summary

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
