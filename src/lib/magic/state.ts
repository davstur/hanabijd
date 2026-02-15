import { GameMode } from "~/lib/state";

/**
 * Magic: The Gathering game state types.
 *
 * Unlike Hanabi, there is no rule enforcement — players manually move
 * cards between zones, adjust life totals, etc.  The state is stored
 * in full (no turnsHistory reconstruction).
 */

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/** Minimal card reference stored in Firebase. */
export interface IMagicCardRef {
  /** Scryfall UUID — used to fetch images / oracle data. */
  scryfallId: string;
  /** Unique instance id within this game (same card can appear N times). */
  instanceId: string;
  /** Card name (cached so the UI can render without an API call). */
  name: string;
  /** Small image URI (146×204) for thumbnails. */
  imageSmall: string;
  /** Normal image URI (488×680) for zoom. */
  imageNormal: string;
  /** Back-face image URI for DFCs (null for single-faced cards). */
  imageBack?: string;
  /** Whether the card is tapped (rotated 90°). */
  tapped: boolean;
  /** Whether the card is face-down. */
  faceDown: boolean;
  /** Whether a DFC is showing its back face. */
  flipped: boolean;
  /** Generic counters (e.g. +1/+1). */
  counters: number;
  /** X position on the battlefield (percentage 0–100). */
  x?: number;
  /** Y position on the battlefield (percentage 0–100). */
  y?: number;
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

/** A token creature on the battlefield. */
export interface IMagicToken {
  instanceId: string;
  scryfallId?: string;
  name: string;
  imageSmall: string;
  imageNormal: string;
  tapped: boolean;
  counters: number;
  /** Power / Toughness text, e.g. "1/1" */
  pt?: string;
  /** X position on the battlefield (percentage 0–100). */
  x?: number;
  /** Y position on the battlefield (percentage 0–100). */
  y?: number;
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export enum MagicZone {
  LIBRARY = "library",
  HAND = "hand",
  BATTLEFIELD = "battlefield",
  GRAVEYARD = "graveyard",
  EXILE = "exile",
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export interface IMagicPlayer {
  name: string;
  life: number;
  library: IMagicCardRef[];
  hand: IMagicCardRef[];
  battlefield: IMagicCardRef[];
  graveyard: IMagicCardRef[];
  exile: IMagicCardRef[];
  tokens: IMagicToken[];
}

// ---------------------------------------------------------------------------
// Game options
// ---------------------------------------------------------------------------

export interface IMagicGameOptions {
  id: string;
  playersCount: number;
  startingLife: number;
  gameMode: GameMode;
}

// ---------------------------------------------------------------------------
// Game status
// ---------------------------------------------------------------------------

export enum MagicGameStatus {
  LOBBY = "lobby",
  ONGOING = "ongoing",
  OVER = "over",
}

// ---------------------------------------------------------------------------
// Log entry
// ---------------------------------------------------------------------------

export interface IMagicLogEntry {
  timestamp: number;
  playerIndex: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Deck (pre-game)
// ---------------------------------------------------------------------------

export interface IMagicDeckEntry {
  count: number;
  name: string;
}

export interface IMagicDeckSelection {
  name: string;
  cards: IMagicCardRef[];
}

// ---------------------------------------------------------------------------
// Full game state
// ---------------------------------------------------------------------------

export default interface IMagicGameState {
  id: string;
  gameType: "magic";
  status: MagicGameStatus;
  players: IMagicPlayer[];
  currentPlayer: number;
  options: IMagicGameOptions;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  log: IMagicLogEntry[];
  /** Stores original decklists so "restart" can reshuffle from scratch. */
  originalDecks?: IMagicCardRef[][];
}
