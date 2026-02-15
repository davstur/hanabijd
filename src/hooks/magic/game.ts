import React, { useContext } from "react";
import IMagicGameState, { IMagicPlayer } from "~/lib/magic/state";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const MagicGameContext = React.createContext<IMagicGameState | null>(null);

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useMagicGame(): IMagicGameState | null {
  return useContext(MagicGameContext);
}

const NAME_KEY = "name";

function getPlayerName(): string {
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

/**
 * Returns the current user's player object, or null if they haven't joined.
 */
export function useMagicSelfPlayer(game: IMagicGameState | null): IMagicPlayer | null {
  if (!game) return null;
  const name = getPlayerName();
  return game.players.find((p) => p.name === name) || null;
}

/**
 * Returns the index of the current user in the players array, or -1.
 */
export function useMagicSelfPlayerIndex(game: IMagicGameState | null): number {
  if (!game) return -1;
  const name = getPlayerName();
  return game.players.findIndex((p) => p.name === name);
}
