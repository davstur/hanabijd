/**
 * Firebase layer for Magic: The Gathering games.
 *
 * Magic games are stored at /magic-games/{gameId} — separate from
 * Hanabi games at /games/{gameId}.
 *
 * Unlike Hanabi, the full state is persisted (no turnsHistory
 * reconstruction).
 */

import firebase from "firebase/app";
import "firebase/database";
import { cloneDeep } from "lodash";
import { IMagicGameState } from "~/lib/magic/state";

// ---------------------------------------------------------------------------
// Firebase reference
// ---------------------------------------------------------------------------

function database() {
  // Reuse the same firebase app initialised by ~/lib/firebase.ts
  if (!firebase.apps.length) {
    firebase.initializeApp({
      ...(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL && {
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      }),
      ...(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      }),
    });
  }
  return firebase.database();
}

// ---------------------------------------------------------------------------
// Helpers — Firebase returns null for empty arrays
// ---------------------------------------------------------------------------

function fillEmpty(state: IMagicGameState | null): IMagicGameState | null {
  if (!state) return null;

  state.log = state.log || [];
  state.players = (state.players || []).map((p) => ({
    ...p,
    library: p.library || [],
    hand: p.hand || [],
    battlefield: p.battlefield || [],
    graveyard: p.graveyard || [],
    exile: p.exile || [],
    tokens: p.tokens || [],
  }));
  state.originalDecks = state.originalDecks || [];

  return state;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function loadMagicGame(gameId: string): Promise<IMagicGameState | null> {
  const ref = database().ref(`/magic-games/${gameId}`);
  const event = await ref.once("value");
  return fillEmpty(event.val() as IMagicGameState | null);
}

export function subscribeToMagicGame(gameId: string, callback: (game: IMagicGameState | null) => void) {
  const ref = database().ref(`/magic-games/${gameId}`);

  ref.on("value", (event) => {
    callback(fillEmpty(event.val() as IMagicGameState | null));
  });

  return () => ref.off();
}

export async function updateMagicGame(game: IMagicGameState): Promise<void> {
  if (typeof window !== "undefined") {
    window["magic"] = cloneDeep(game);
  }

  try {
    await database().ref(`/magic-games/${game.id}`).set(game);
  } catch (e) {
    console.error(`DB Error: updateMagicGame\n ${e}`);
    throw e;
  }
}
