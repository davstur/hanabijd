/**
 * Pure state transitions for Magic: The Gathering games.
 *
 * No rule enforcement — every function simply moves data between
 * arrays and returns a new state object.
 */

import { cloneDeep } from "lodash";
import {
  IMagicCardRef,
  IMagicGameState,
  IMagicPlayer,
  IMagicToken,
  MagicGameStatus,
  MagicPhase,
  MagicZone,
} from "~/lib/magic/state";
import { GameMode } from "~/lib/state";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clone(state: IMagicGameState): IMagicGameState {
  return cloneDeep(state);
}

function addLog(state: IMagicGameState, playerIndex: number, description: string): void {
  state.log.push({ timestamp: Date.now(), playerIndex, description });
  // Keep last 100 log entries
  if (state.log.length > 100) {
    state.log = state.log.slice(-100);
  }
}

function getZone(player: IMagicPlayer, zone: MagicZone): IMagicCardRef[] {
  return player[zone];
}

function setZone(player: IMagicPlayer, zone: MagicZone, cards: IMagicCardRef[]): void {
  player[zone] = cards;
}

// ---------------------------------------------------------------------------
// Fisher-Yates shuffle
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Game creation
// ---------------------------------------------------------------------------

export interface NewMagicGameArgs {
  id: string;
  playersCount: number;
  startingLife: number;
  gameMode: GameMode;
  players: { name: string; deck: IMagicCardRef[] }[];
}

export function newMagicGame(args: NewMagicGameArgs): IMagicGameState {
  const players: IMagicPlayer[] = args.players.map((p) => {
    const shuffled = shuffle(p.deck);
    return {
      name: p.name,
      life: args.startingLife,
      library: shuffled.slice(7),
      hand: shuffled.slice(0, 7),
      battlefield: [],
      graveyard: [],
      exile: [],
      tokens: [],
    };
  });

  return {
    id: args.id,
    gameType: "magic",
    status: MagicGameStatus.ONGOING,
    players,
    currentPlayer: 0,
    currentPhase: MagicPhase.BEGINNING,
    options: {
      playersCount: args.playersCount,
      startingLife: args.startingLife,
      gameMode: args.gameMode,
    },
    createdAt: Date.now(),
    startedAt: Date.now(),
    log: [{ timestamp: Date.now(), playerIndex: -1, description: "Game started" }],
    originalDecks: args.players.map((p) => cloneDeep(p.deck)),
  };
}

/**
 * Create a lobby state before decks are selected.
 */
export function newMagicLobby(
  id: string,
  playersCount: number,
  startingLife: number,
  gameMode: GameMode
): IMagicGameState {
  return {
    id,
    gameType: "magic",
    status: MagicGameStatus.LOBBY,
    players: [],
    currentPlayer: 0,
    currentPhase: MagicPhase.BEGINNING,
    options: {
      playersCount,
      startingLife,
      gameMode,
    },
    createdAt: Date.now(),
    log: [],
  };
}

// ---------------------------------------------------------------------------
// Card movement
// ---------------------------------------------------------------------------

export function drawCard(state: IMagicGameState, playerIndex: number): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p || p.library.length === 0) return s;
  const card = p.library.shift()!;
  card.faceDown = false;
  p.hand.push(card);
  addLog(s, playerIndex, "Drew a card");
  return s;
}

export function drawCards(state: IMagicGameState, playerIndex: number, count: number): IMagicGameState {
  let s = state;
  for (let i = 0; i < count; i++) {
    s = drawCard(s, playerIndex);
  }
  return s;
}

export function moveCard(
  state: IMagicGameState,
  playerIndex: number,
  cardInstanceId: string,
  fromZone: MagicZone,
  toZone: MagicZone,
  position: "top" | "bottom" = "top"
): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;

  const from = getZone(p, fromZone);
  const idx = from.findIndex((c) => c.instanceId === cardInstanceId);
  if (idx === -1) return s;

  const [card] = from.splice(idx, 1);
  // Reset visual state when moving between zones
  card.tapped = false;
  if (toZone !== MagicZone.BATTLEFIELD) {
    card.faceDown = false;
  }

  const to = getZone(p, toZone);
  if (position === "bottom") {
    to.push(card);
  } else {
    // "top" for library means index 0; for other zones, append
    if (toZone === MagicZone.LIBRARY) {
      to.unshift(card);
    } else {
      to.push(card);
    }
  }
  setZone(p, fromZone, from);
  setZone(p, toZone, to);

  addLog(s, playerIndex, `Moved ${card.faceDown ? "a card" : card.name} to ${toZone}`);
  return s;
}

// ---------------------------------------------------------------------------
// Card state
// ---------------------------------------------------------------------------

export function tapCard(state: IMagicGameState, playerIndex: number, cardInstanceId: string): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;

  const card = p.battlefield.find((c) => c.instanceId === cardInstanceId);
  if (card) {
    card.tapped = !card.tapped;
  }
  return s;
}

export function untapAll(state: IMagicGameState, playerIndex: number): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;

  for (const card of p.battlefield) {
    card.tapped = false;
  }
  for (const token of p.tokens) {
    token.tapped = false;
  }
  addLog(s, playerIndex, "Untapped all");
  return s;
}

export function toggleFaceDown(state: IMagicGameState, playerIndex: number, cardInstanceId: string): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;

  const card = p.battlefield.find((c) => c.instanceId === cardInstanceId);
  if (card) {
    card.faceDown = !card.faceDown;
  }
  return s;
}

export function flipCard(state: IMagicGameState, playerIndex: number, cardInstanceId: string): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;

  const card = p.battlefield.find((c) => c.instanceId === cardInstanceId);
  if (card && card.imageBack) {
    card.flipped = !card.flipped;
  }
  return s;
}

export function adjustCounter(
  state: IMagicGameState,
  playerIndex: number,
  cardInstanceId: string,
  delta: number
): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;

  const card = p.battlefield.find((c) => c.instanceId === cardInstanceId);
  if (card) {
    card.counters = Math.max(0, card.counters + delta);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Card / token positioning
// ---------------------------------------------------------------------------

function setPosition(
  items: { instanceId: string; x?: number; y?: number }[],
  instanceId: string,
  x: number,
  y: number
): void {
  const item = items.find((i) => i.instanceId === instanceId);
  if (item) {
    item.x = x;
    item.y = y;
  }
}

export function moveCardPosition(
  state: IMagicGameState,
  playerIndex: number,
  cardInstanceId: string,
  x: number,
  y: number
): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;
  setPosition(p.battlefield, cardInstanceId, x, y);
  return s;
}

export function moveTokenPosition(
  state: IMagicGameState,
  playerIndex: number,
  tokenInstanceId: string,
  x: number,
  y: number
): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;
  setPosition(p.tokens, tokenInstanceId, x, y);
  return s;
}

// ---------------------------------------------------------------------------
// Life
// ---------------------------------------------------------------------------

export function setLife(state: IMagicGameState, playerIndex: number, life: number): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;
  const prev = p.life;
  p.life = life;
  const diff = life - prev;
  if (diff !== 0) {
    addLog(s, playerIndex, `Life: ${prev} → ${life} (${diff > 0 ? "+" : ""}${diff})`);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Library operations
// ---------------------------------------------------------------------------

export function shuffleLibrary(state: IMagicGameState, playerIndex: number): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;
  p.library = shuffle(p.library);
  addLog(s, playerIndex, "Shuffled library");
  return s;
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

let nextTokenId = 1;

export function createToken(
  state: IMagicGameState,
  playerIndex: number,
  token: Omit<IMagicToken, "instanceId" | "tapped" | "counters">
): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;

  p.tokens.push({
    ...token,
    instanceId: `token-${nextTokenId++}-${Math.random().toString(36).slice(2, 8)}`,
    tapped: false,
    counters: 0,
  });
  addLog(s, playerIndex, `Created ${token.name} token`);
  return s;
}

export function removeToken(state: IMagicGameState, playerIndex: number, tokenInstanceId: string): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;
  p.tokens = p.tokens.filter((t) => t.instanceId !== tokenInstanceId);
  return s;
}

export function tapToken(state: IMagicGameState, playerIndex: number, tokenInstanceId: string): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;
  const token = p.tokens.find((t) => t.instanceId === tokenInstanceId);
  if (token) {
    token.tapped = !token.tapped;
  }
  return s;
}

export function adjustTokenCounter(
  state: IMagicGameState,
  playerIndex: number,
  tokenInstanceId: string,
  delta: number
): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;
  const token = p.tokens.find((t) => t.instanceId === tokenInstanceId);
  if (token) {
    token.counters = Math.max(0, token.counters + delta);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Mulligan
// ---------------------------------------------------------------------------

export function mulligan(state: IMagicGameState, playerIndex: number): IMagicGameState {
  const s = clone(state);
  const p = s.players[playerIndex];
  if (!p) return s;

  const currentHandSize = p.hand.length;
  // Return hand to library
  p.library = [...p.library, ...p.hand];
  p.hand = [];
  // Shuffle
  p.library = shuffle(p.library);
  // Draw one fewer (minimum 1)
  const drawCount = Math.max(1, currentHandSize - 1);
  for (let i = 0; i < drawCount && p.library.length > 0; i++) {
    p.hand.push(p.library.shift()!);
  }
  addLog(s, playerIndex, `Mulligan to ${drawCount}`);
  return s;
}

// ---------------------------------------------------------------------------
// Restart
// ---------------------------------------------------------------------------

export function restartGame(state: IMagicGameState): IMagicGameState {
  const s = clone(state);
  if (!s.originalDecks) return s;

  for (let i = 0; i < s.players.length; i++) {
    const deck = cloneDeep(s.originalDecks[i]);
    const shuffled = shuffle(deck);
    s.players[i].library = shuffled.slice(7);
    s.players[i].hand = shuffled.slice(0, 7);
    s.players[i].battlefield = [];
    s.players[i].graveyard = [];
    s.players[i].exile = [];
    s.players[i].tokens = [];
    s.players[i].life = s.options.startingLife;
  }
  s.currentPlayer = 0;
  s.currentPhase = MagicPhase.BEGINNING;
  s.status = MagicGameStatus.ONGOING;
  s.startedAt = Date.now();
  s.log = [{ timestamp: Date.now(), playerIndex: -1, description: "Game restarted" }];
  return s;
}

// ---------------------------------------------------------------------------
// Concede / End
// ---------------------------------------------------------------------------

export function concedeGame(state: IMagicGameState, playerIndex: number): IMagicGameState {
  const s = clone(state);
  addLog(s, playerIndex, "Conceded");
  s.status = MagicGameStatus.OVER;
  s.endedAt = Date.now();
  return s;
}

// ---------------------------------------------------------------------------
// Phase progression
// ---------------------------------------------------------------------------

export const PHASE_ORDER = [
  MagicPhase.BEGINNING,
  MagicPhase.MAIN_1,
  MagicPhase.COMBAT,
  MagicPhase.MAIN_2,
  MagicPhase.END,
];

export const PHASE_LABELS: Record<MagicPhase, string> = {
  [MagicPhase.BEGINNING]: "Beginning",
  [MagicPhase.MAIN_1]: "Main 1",
  [MagicPhase.COMBAT]: "Combat",
  [MagicPhase.MAIN_2]: "Main 2",
  [MagicPhase.END]: "End",
};

export function nextPhase(state: IMagicGameState): IMagicGameState {
  const s = clone(state);
  const current = s.currentPhase;
  const idx = PHASE_ORDER.indexOf(current);

  if (idx === PHASE_ORDER.length - 1) {
    // End phase → next player's Beginning
    s.currentPlayer = (s.currentPlayer + 1) % s.players.length;
    s.currentPhase = MagicPhase.BEGINNING;
    addLog(s, s.currentPlayer, "Turn started");
  } else {
    s.currentPhase = PHASE_ORDER[idx + 1];
    addLog(s, s.currentPlayer, `→ ${PHASE_LABELS[s.currentPhase]}`);
  }
  return s;
}
