/**
 * Smoke tests for Magic: The Gathering game logic.
 * Run with: node --import tsx src/lib/magic/__tests__/smoke.ts
 */

import { parseDeckList, resolveDeckList, PREBUILT_DECKS } from "../decks";
import {
  newMagicGame,
  newMagicLobby,
  drawCard,
  moveCard,
  tapCard,
  untapAll,
  setLife,
  shuffleLibrary,
  mulligan,
  restartGame,
  concedeGame,
  passTurn,
  createToken,
  removeToken,
  flipCard,
  toggleFaceDown,
  adjustCounter,
  drawCards,
  tapToken,
  adjustTokenCounter,
} from "../actions";
import { GameMode } from "~/lib/state";
import { MagicGameStatus, MagicZone } from "../state";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Deck parsing
// ---------------------------------------------------------------------------
console.log("\n--- Deck Parsing ---");

const deckText = `4 Lightning Bolt
4x Counterspell
1 Black Lotus
// comment
Sideboard
2 Swords to Plowshares`;

const entries = parseDeckList(deckText);
assert(entries.length === 3, `Parsed 3 entries (got ${entries.length})`);
assert(entries[0].count === 4, `First entry count is 4`);
assert(entries[0].name === "Lightning Bolt", `First entry name is Lightning Bolt`);
assert(entries[1].count === 4, `Second entry handles 'x' suffix`);
assert(entries[2].count === 1, `Third entry count is 1`);

// Empty / invalid input
assert(parseDeckList("").length === 0, "Empty string returns empty array");
assert(parseDeckList("// just comments\n\n").length === 0, "Comments-only returns empty");

// Prebuilt decks all parse
for (const deck of PREBUILT_DECKS) {
  const e = parseDeckList(deck.list);
  const totalCards = e.reduce((sum, x) => sum + x.count, 0);
  assert(totalCards >= 40, `${deck.name}: ${totalCards} cards (>= 40)`);
}

// ---------------------------------------------------------------------------
// Game creation & lobby
// ---------------------------------------------------------------------------
console.log("\n--- Game Lobby ---");

const lobby = newMagicLobby("test-1", 2, 20, GameMode.NETWORK);
assert(lobby.status === MagicGameStatus.LOBBY, "Lobby status is LOBBY");
assert(lobby.players.length === 0, "Lobby starts with 0 players");
assert(lobby.options.startingLife === 20, "Starting life is 20");
assert(lobby.options.playersCount === 2, "Players count is 2");

// ---------------------------------------------------------------------------
// Game creation with decks
// ---------------------------------------------------------------------------
console.log("\n--- Game Creation ---");

// Create mock cards (no Scryfall needed)
function mockCard(name: string, id: string) {
  return {
    scryfallId: `scryfall-${id}`,
    instanceId: `inst-${id}`,
    name,
    imageSmall: `https://example.com/small/${id}.jpg`,
    imageNormal: `https://example.com/normal/${id}.jpg`,
    tapped: false,
    faceDown: false,
    flipped: false,
    counters: 0,
  };
}

const deck1 = Array.from({ length: 60 }, (_, i) => mockCard(`Card A${i}`, `a${i}`));
const deck2 = Array.from({ length: 60 }, (_, i) => mockCard(`Card B${i}`, `b${i}`));

const game = newMagicGame({
  id: "test-game-1",
  playersCount: 2,
  startingLife: 20,
  gameMode: GameMode.NETWORK,
  players: [
    { name: "Alice", deck: deck1 },
    { name: "Bob", deck: deck2 },
  ],
});

assert(game.status === MagicGameStatus.ONGOING, "Game status is ONGOING");
assert(game.players.length === 2, "Game has 2 players");
assert(game.players[0].name === "Alice", "Player 0 is Alice");
assert(game.players[1].name === "Bob", "Player 1 is Bob");
assert(game.players[0].hand.length === 7, "Alice drew 7 cards");
assert(game.players[1].hand.length === 7, "Bob drew 7 cards");
assert(game.players[0].library.length === 53, "Alice has 53 in library");
assert(game.players[1].library.length === 53, "Bob has 53 in library");
assert(game.players[0].life === 20, "Alice life is 20");
assert(game.players[1].life === 20, "Bob life is 20");
assert(game.players[0].battlefield.length === 0, "Empty battlefield");
assert(game.players[0].graveyard.length === 0, "Empty graveyard");
assert(game.players[0].exile.length === 0, "Empty exile");
assert(game.originalDecks!.length === 2, "Original decks stored");
assert(game.log.length === 1, "Initial log entry exists");

// ---------------------------------------------------------------------------
// Draw cards
// ---------------------------------------------------------------------------
console.log("\n--- Draw ---");

let g = drawCard(game, 0);
assert(g.players[0].hand.length === 8, "Alice has 8 cards after draw");
assert(g.players[0].library.length === 52, "Alice has 52 in library");

g = drawCards(g, 0, 3);
assert(g.players[0].hand.length === 11, "Alice has 11 cards after drawing 3 more");

// ---------------------------------------------------------------------------
// Move card between zones
// ---------------------------------------------------------------------------
console.log("\n--- Move Card ---");

const cardToPlay = g.players[0].hand[0];
g = moveCard(g, 0, cardToPlay.instanceId, MagicZone.HAND, MagicZone.BATTLEFIELD);
assert(g.players[0].hand.length === 10, "Hand shrunk by 1");
assert(g.players[0].battlefield.length === 1, "Battlefield has 1 card");
assert(g.players[0].battlefield[0].instanceId === cardToPlay.instanceId, "Correct card on battlefield");

// Move from battlefield to graveyard
g = moveCard(g, 0, cardToPlay.instanceId, MagicZone.BATTLEFIELD, MagicZone.GRAVEYARD);
assert(g.players[0].battlefield.length === 0, "Battlefield empty after move to GY");
assert(g.players[0].graveyard.length === 1, "Graveyard has 1 card");

// Move from graveyard to exile
const gyCard = g.players[0].graveyard[0];
g = moveCard(g, 0, gyCard.instanceId, MagicZone.GRAVEYARD, MagicZone.EXILE);
assert(g.players[0].graveyard.length === 0, "Graveyard empty");
assert(g.players[0].exile.length === 1, "Exile has 1 card");

// Move to top of library
const exileCard = g.players[0].exile[0];
g = moveCard(g, 0, exileCard.instanceId, MagicZone.EXILE, MagicZone.LIBRARY, "top");
assert(g.players[0].exile.length === 0, "Exile empty");
assert(g.players[0].library[0].instanceId === exileCard.instanceId, "Card is on top of library");

// Move to bottom of library
const topCard = g.players[0].library[0];
g = moveCard(g, 0, topCard.instanceId, MagicZone.LIBRARY, MagicZone.LIBRARY, "bottom");
const lib = g.players[0].library;
assert(lib[lib.length - 1].instanceId === topCard.instanceId, "Card moved to bottom of library");

// ---------------------------------------------------------------------------
// Tap / Untap
// ---------------------------------------------------------------------------
console.log("\n--- Tap / Untap ---");

// Put a card on battlefield first
const handCard = g.players[0].hand[0];
g = moveCard(g, 0, handCard.instanceId, MagicZone.HAND, MagicZone.BATTLEFIELD);
g = tapCard(g, 0, handCard.instanceId);
assert(g.players[0].battlefield[0].tapped === true, "Card is tapped");

g = tapCard(g, 0, handCard.instanceId);
assert(g.players[0].battlefield[0].tapped === false, "Card is untapped (toggle)");

// Add another card, tap both, then untap all
const handCard2 = g.players[0].hand[0];
g = moveCard(g, 0, handCard2.instanceId, MagicZone.HAND, MagicZone.BATTLEFIELD);
g = tapCard(g, 0, handCard.instanceId);
g = tapCard(g, 0, handCard2.instanceId);
assert(g.players[0].battlefield.every((c) => c.tapped), "Both tapped");

g = untapAll(g, 0);
assert(g.players[0].battlefield.every((c) => !c.tapped), "All untapped");

// ---------------------------------------------------------------------------
// Face down / Flip
// ---------------------------------------------------------------------------
console.log("\n--- Face Down / Flip ---");

g = toggleFaceDown(g, 0, handCard.instanceId);
assert(g.players[0].battlefield.find((c) => c.instanceId === handCard.instanceId)!.faceDown === true, "Card face down");

g = toggleFaceDown(g, 0, handCard.instanceId);
assert(
  g.players[0].battlefield.find((c) => c.instanceId === handCard.instanceId)!.faceDown === false,
  "Card face up again"
);

// Flip for DFC (requires imageBack)
const bfCard = g.players[0].battlefield[0];
// No imageBack set, so flip should be a no-op
g = flipCard(g, 0, bfCard.instanceId);
assert(g.players[0].battlefield[0].flipped === false, "Flip no-op without imageBack");

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------
console.log("\n--- Counters ---");

g = adjustCounter(g, 0, handCard.instanceId, 1);
assert(
  g.players[0].battlefield.find((c) => c.instanceId === handCard.instanceId)!.counters === 1,
  "1 counter added"
);

g = adjustCounter(g, 0, handCard.instanceId, 3);
assert(
  g.players[0].battlefield.find((c) => c.instanceId === handCard.instanceId)!.counters === 4,
  "4 counters total"
);

g = adjustCounter(g, 0, handCard.instanceId, -2);
assert(
  g.players[0].battlefield.find((c) => c.instanceId === handCard.instanceId)!.counters === 2,
  "2 counters after removing 2"
);

g = adjustCounter(g, 0, handCard.instanceId, -10);
assert(
  g.players[0].battlefield.find((c) => c.instanceId === handCard.instanceId)!.counters === 0,
  "Counters don't go below 0"
);

// ---------------------------------------------------------------------------
// Life
// ---------------------------------------------------------------------------
console.log("\n--- Life ---");

g = setLife(g, 0, 15);
assert(g.players[0].life === 15, "Alice life set to 15");

g = setLife(g, 1, 7);
assert(g.players[1].life === 7, "Bob life set to 7");

g = setLife(g, 0, -3);
assert(g.players[0].life === -3, "Life can go negative");

// ---------------------------------------------------------------------------
// Shuffle
// ---------------------------------------------------------------------------
console.log("\n--- Shuffle ---");

const libraryBefore = g.players[0].library.map((c) => c.instanceId).join(",");
g = shuffleLibrary(g, 0);
const libraryAfter = g.players[0].library.map((c) => c.instanceId).join(",");
assert(g.players[0].library.length === lib.length, "Library size unchanged after shuffle");
// With 50+ cards, it's extremely unlikely shuffle produces same order
// but we can't guarantee it, so just check size is correct

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
console.log("\n--- Tokens ---");

g = createToken(g, 0, {
  name: "Soldier",
  imageSmall: "",
  imageNormal: "",
  pt: "1/1",
});
assert(g.players[0].tokens.length === 1, "1 token created");
assert(g.players[0].tokens[0].name === "Soldier", "Token name correct");
assert(g.players[0].tokens[0].pt === "1/1", "Token P/T correct");
assert(g.players[0].tokens[0].tapped === false, "Token untapped");

const tokenId = g.players[0].tokens[0].instanceId;
g = tapToken(g, 0, tokenId);
assert(g.players[0].tokens[0].tapped === true, "Token tapped");

g = adjustTokenCounter(g, 0, tokenId, 2);
assert(g.players[0].tokens[0].counters === 2, "Token has 2 counters");

g = removeToken(g, 0, tokenId);
assert(g.players[0].tokens.length === 0, "Token removed");

// Untap all also untaps tokens
g = createToken(g, 0, { name: "Zombie", imageSmall: "", imageNormal: "", pt: "2/2" });
g = tapToken(g, 0, g.players[0].tokens[0].instanceId);
g = untapAll(g, 0);
assert(g.players[0].tokens[0].tapped === false, "Untap all also untaps tokens");

// ---------------------------------------------------------------------------
// Mulligan
// ---------------------------------------------------------------------------
console.log("\n--- Mulligan ---");

let mg = newMagicGame({
  id: "mulligan-test",
  playersCount: 2,
  startingLife: 20,
  gameMode: GameMode.NETWORK,
  players: [
    { name: "Alice", deck: deck1 },
    { name: "Bob", deck: deck2 },
  ],
});
assert(mg.players[0].hand.length === 7, "Start with 7");

mg = mulligan(mg, 0);
assert(mg.players[0].hand.length === 6, "Mulligan to 6");
assert(mg.players[0].library.length === 54, "Library has 54 after mulligan");

mg = mulligan(mg, 0);
assert(mg.players[0].hand.length === 5, "Mulligan to 5");

// ---------------------------------------------------------------------------
// Pass turn
// ---------------------------------------------------------------------------
console.log("\n--- Pass Turn ---");

let pt = newMagicGame({
  id: "turn-test",
  playersCount: 2,
  startingLife: 20,
  gameMode: GameMode.NETWORK,
  players: [
    { name: "Alice", deck: deck1 },
    { name: "Bob", deck: deck2 },
  ],
});
assert(pt.currentPlayer === 0, "Starts with player 0");
pt = passTurn(pt);
assert(pt.currentPlayer === 1, "After pass, player 1");
pt = passTurn(pt);
assert(pt.currentPlayer === 0, "After pass again, player 0");

// ---------------------------------------------------------------------------
// Concede
// ---------------------------------------------------------------------------
console.log("\n--- Concede ---");

let cg = newMagicGame({
  id: "concede-test",
  playersCount: 2,
  startingLife: 20,
  gameMode: GameMode.NETWORK,
  players: [
    { name: "Alice", deck: deck1 },
    { name: "Bob", deck: deck2 },
  ],
});
cg = concedeGame(cg, 0);
assert(cg.status === MagicGameStatus.OVER, "Game is over after concede");
assert(cg.endedAt! > 0, "endedAt is set");

// ---------------------------------------------------------------------------
// Restart
// ---------------------------------------------------------------------------
console.log("\n--- Restart ---");

let rg = newMagicGame({
  id: "restart-test",
  playersCount: 2,
  startingLife: 20,
  gameMode: GameMode.NETWORK,
  players: [
    { name: "Alice", deck: deck1 },
    { name: "Bob", deck: deck2 },
  ],
});
// Play some cards, change life
rg = drawCards(rg, 0, 5);
rg = setLife(rg, 0, 5);
rg = concedeGame(rg, 0);

rg = restartGame(rg);
assert(rg.status === MagicGameStatus.ONGOING, "Status back to ONGOING");
assert(rg.players[0].hand.length === 7, "Hand reset to 7");
assert(rg.players[0].life === 20, "Life reset to 20");
assert(rg.players[0].battlefield.length === 0, "Battlefield cleared");
assert(rg.players[0].graveyard.length === 0, "Graveyard cleared");
assert(rg.players[0].exile.length === 0, "Exile cleared");
assert(rg.players[0].tokens.length === 0, "Tokens cleared");

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
console.log("\n--- Edge Cases ---");

// Draw from empty library
let eg = newMagicGame({
  id: "edge-test",
  playersCount: 2,
  startingLife: 20,
  gameMode: GameMode.NETWORK,
  players: [
    { name: "Alice", deck: Array.from({ length: 7 }, (_, i) => mockCard(`C${i}`, `e${i}`)) },
    { name: "Bob", deck: deck2 },
  ],
});
assert(eg.players[0].library.length === 0, "Alice starts with empty library (7 card deck)");
eg = drawCard(eg, 0);
assert(eg.players[0].hand.length === 7, "Draw from empty library is no-op");

// Move nonexistent card
const before = { ...eg.players[0] };
eg = moveCard(eg, 0, "nonexistent-id", MagicZone.HAND, MagicZone.BATTLEFIELD);
assert(eg.players[0].hand.length === before.hand!.length, "Move nonexistent card is no-op");

// Invalid player index
eg = drawCard(eg, 99);
assert(eg.players[0].hand.length === 7, "Invalid player index is no-op");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
