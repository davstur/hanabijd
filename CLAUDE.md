# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hanab is a cooperative card game web app (hosted at hanab.cards). Players take turns giving hints, playing cards, or discarding to collaboratively build ordered card piles by color. The app supports online multiplayer via rooms, pass-and-play mode, AI bots, game replay, and multiple game variants.

## Commands

```bash
# Install dependencies
npm install

# Dev server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Lint
npm run lint

# Firebase Cloud Functions (in functions/ directory)
cd functions && npm run serve   # local emulator
cd functions && npm run deploy  # deploy to Firebase
```

Note: `--openssl-legacy-provider` is required for Node 22 compatibility and is already configured in the npm scripts via `cross-env`.

## Environment Setup

Copy `.env.sample` to `.env` and configure Firebase credentials. A Firebase Realtime Database project is required for local development.

## Architecture

### Tech Stack
- **Framework**: Next.js 13 (Pages Router) with TypeScript
- **Database**: Firebase Realtime Database (real-time sync via subscriptions)
- **Push Notifications**: Firebase Cloud Functions + Web Push (VAPID)
- **CSS**: Tachyons (functional CSS utility classes) with custom overrides in `src/styles/`
- **i18n**: react-i18next with 10 languages (locale files in `src/locales/`)

### Path Alias
`~/` maps to `src/` (configured in tsconfig.json). All imports use this alias.

### Core Game Logic (`src/lib/`)

The game engine is **pure functional** — all state transitions produce new `IGameState` objects via immutable operations:

- **`state.ts`** — Central type definitions (`IGameState`, `IPlayer`, `ICard`, `IAction`, etc.) and state utilities. `rebuildGame()` reconstructs full game state from options + players + turns history (Firebase only stores minimal state via `cleanState()`). `fillEmptyValues()` handles Firebase returning `null` for empty arrays.
- **`actions.ts`** — Game engine. `newGame()` creates initial state, `joinGame()` adds players, `commitAction()` applies play/discard/hint actions. `getStateAtTurn()` replays to arbitrary turn (memoized). Contains all game rules: playability checks, hint application, scoring, game-over detection.
- **`firebase.ts`** — Database layer. CRUD for games and rooms, real-time subscriptions via Firebase `on("value")`. Rooms contain members and game ID lists.
- **`ai.ts`** / **`ai-cheater.ts`** — Bot AI. Regular AI plays with public info only; cheater AI has perfect information and computes maximum achievable score for end-game comparison.
- **`notifications.ts`** — Web Push subscription management, service worker registration.
- **`id.ts`** — ID generation. Game IDs are human-readable (e.g., `AdjectiveAnimalColor-0`), with sequential suffixes for rematches.

### Game State Flow

Firebase stores a **minimal state** (no derived data like hands, played/discard piles). On load, `rebuildGame()` replays all turns from `turnsHistory` to reconstruct the full state. This means the turns history is the source of truth.

### Pages (`src/pages/`)

- `/` — Home: create/join rooms
- `/rooms/[roomId]` — Room lobby with member list, game list, notifications
- `/new-game` — Game creation form (variant, player count, options)
- `/[gameId]` — Main game view (SSR loads initial state, then real-time sync)
- `/[gameId]/summary` — Post-game summary

### Key Components (`src/components/`)

- **`GameIndex.tsx`** — Client-only wrapper (no SSR) that subscribes to real-time game updates
- **`game.tsx`** — Main game orchestrator: manages game lifecycle, bot play, replay, actions
- **`lobby.tsx`** — Pre-game player join screen
- **`playersBoard.tsx`** / **`playerGame.tsx`** — Card display and interaction
- **`tutorial.tsx`** — Tutorial system with step-by-step guided play

### Hooks (`src/hooks/`)

- **`game.ts`** — `useGame()` provides current game state (handles replay mode), `useSelfPlayer()` identifies current user
- **`replay.ts`** — Replay cursor context for reviewing past turns
- **`session.ts`** — Player ID from server session (iron-session)
- **`notifications.ts`** — Notification handling for turn alerts

### Game Variants

Classic (5 colors), Multicolor (6th unique color), Rainbow (wild color matching all hints), Critical Rainbow (single-copy rainbow), Orange (6th full color), Sequence (number hints match >= value).

## Code Style

- **Prettier**: 120 char width, ES5 trailing commas, consistent quote props
- **ESLint**: TypeScript + React + Prettier integration. JSX props must be sorted (`react/jsx-sort-props`: callbacks last, shorthand first, reserved first).
- **Strict mode disabled** in TypeScript config.

## Adding a New Language

1. Create locale file in `src/locales/` (copy `en.ts` as template)
2. Import and register in `src/lib/i18n.ts`
3. Add to `Languages` map in `src/components/languageSelector.tsx`
