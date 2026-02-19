import { GameMode } from "~/lib/state";

/**
 * Magic: The Gathering game state types.
 *
 * Unlike Hanabi, there is no rule enforcement — players manually move
 * cards between zones, adjust life totals, etc.  The state is stored
 * in full (no turnsHistory reconstruction).
 */

// ---------------------------------------------------------------------------
// Shared base for cards and tokens on the battlefield
// ---------------------------------------------------------------------------

/** Fields shared by cards and tokens. */
export interface IMagicBattlefieldItem {
  /** Unique instance id within this game. */
  instanceId: string;
  /** Display name (cached so the UI can render without an API call). */
  name: string;
  /** Small image URI (146×204) for thumbnails. */
  imageSmall: string;
  /** Normal image URI (488×680) for zoom. */
  imageNormal: string;
  /** Whether the item is tapped (rotated 90°). */
  tapped: boolean;
  /** Generic counters (e.g. +1/+1). */
  counters: number;
  /** X position on the battlefield (percentage 0–100). */
  x?: number;
  /** Y position on the battlefield (percentage 0–100). */
  y?: number;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/** Minimal card reference stored in Firebase. */
export interface IMagicCardRef extends IMagicBattlefieldItem {
  /** Scryfall UUID — used to fetch images / oracle data. */
  scryfallId: string;
  /** Back-face image URI for DFCs (null for single-faced cards). */
  imageBack?: string;
  /** Whether the card is face-down. */
  faceDown: boolean;
  /** Whether a DFC is showing its back face. */
  flipped: boolean;
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

/** A token creature on the battlefield. */
export interface IMagicToken extends IMagicBattlefieldItem {
  scryfallId?: string;
  /** Power / Toughness text, e.g. "1/1" */
  pt?: string;
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
// Turn phases
// ---------------------------------------------------------------------------

export enum MagicPhase {
  BEGINNING = "beginning",
  MAIN_1 = "main1",
  COMBAT = "combat",
  MAIN_2 = "main2",
  END = "end",
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

export interface IMagicSavedDeck {
  id: string;
  name: string;
  cards: IMagicDeckEntry[];
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Full game state
// ---------------------------------------------------------------------------

export interface IMagicGameState {
  id: string;
  gameType: "magic";
  status: MagicGameStatus;
  players: IMagicPlayer[];
  currentPlayer: number;
  currentPhase: MagicPhase;
  options: IMagicGameOptions;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  log: IMagicLogEntry[];
  /** Stores original decklists so "restart" can reshuffle from scratch. */
  originalDecks?: IMagicCardRef[][];
}
