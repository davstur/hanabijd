import { IMagicGameState } from "~/lib/magic/state";

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

const NAME_KEY = "name";

export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem(NAME_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return stored;
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns the index of the current user in the players array, or -1.
 */
export function useMagicSelfPlayerIndex(game: IMagicGameState | null): number {
  if (!game) return -1;
  const name = getPlayerName();
  return game.players.findIndex((p) => p.name === name);
}
