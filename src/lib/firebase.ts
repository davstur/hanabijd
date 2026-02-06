import firebase from "firebase/app";
import "firebase/database";
import { cloneDeep } from "lodash";
import IGameState, { cleanState, fillEmptyValues, IPlayer, rebuildGame } from "~/lib/state";

function database() {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      // Local database configuration using firebase-server
      ...(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL && {
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      }),
      // Online database configuration
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

export async function loadGame(gameId: string) {
  const ref = database().ref(`/games/${gameId}`);

  return new Promise<IGameState>((resolve) => {
    ref.once("value", (event) => {
      resolve(rebuildGame(fillEmptyValues(event.val())));
    });
  });
}

export function subscribeToGame(gameId: string, callback: (game: IGameState) => void) {
  const ref = database().ref(`/games/${gameId}`);

  ref.on("value", (event) => {
    callback(rebuildGame(fillEmptyValues(event.val() as IGameState)));
  });

  return () => ref.off();
}

export async function updateGame(game: IGameState) {
  window["hanab"] = cloneDeep(game);

  try {
    await database().ref(`/games/${game.id}`).set(cleanState(game));
  } catch (e) {
    console.debug(`DB Error: updateGame\n ${e}`);
    throw e;
  }
}

export async function setReaction(game: IGameState, player: IPlayer, reaction: string) {
  await database().ref(`/games/${game.id}/players/${player.index}/reaction`).set(reaction);
}

export async function setNotification(game: IGameState, player: IPlayer, notified: boolean) {
  await database().ref(`/games/${game.id}/players/${player.index}/notified`).set(notified);
}

// --- Rooms ---

export interface IRoomMember {
  id: string;
  name: string;
  joinedAt: number;
}

export interface IRoom {
  id: string;
  createdAt: number;
  members: { [memberId: string]: IRoomMember };
  gameIds: string[];
}

export async function createRoom(roomId: string, member: IRoomMember) {
  const room: IRoom = {
    id: roomId,
    createdAt: Date.now(),
    members: { [member.id]: member },
    gameIds: [],
  };
  await database().ref(`/rooms/${roomId}`).set(room);
  return room;
}

export async function loadRoom(roomId: string): Promise<IRoom | null> {
  const ref = database().ref(`/rooms/${roomId}`);
  return new Promise((resolve) => {
    ref.once("value", (event) => {
      resolve(event.val() as IRoom | null);
    });
  });
}

export function subscribeToRoom(roomId: string, callback: (room: IRoom | null) => void) {
  const ref = database().ref(`/rooms/${roomId}`);

  ref.on("value", (event) => {
    callback(event.val() as IRoom | null);
  });

  return () => ref.off();
}

export async function joinRoom(roomId: string, member: IRoomMember) {
  await database().ref(`/rooms/${roomId}/members/${member.id}`).set(member);
}

export async function leaveRoom(roomId: string, memberId: string) {
  await database().ref(`/rooms/${roomId}/members/${memberId}`).remove();
}

export async function addGameToRoom(roomId: string, gameId: string) {
  const ref = database().ref(`/rooms/${roomId}/gameIds`);
  const snapshot = await ref.once("value");
  const gameIds: string[] = snapshot.val() || [];
  gameIds.push(gameId);
  await ref.set(gameIds);
}

export async function loadRoomGames(gameIds: string[]): Promise<IGameState[]> {
  const games = await Promise.all(
    gameIds.map(async (gameId) => {
      try {
        return await loadGame(gameId);
      } catch {
        return null;
      }
    })
  );
  return games.filter(Boolean) as IGameState[];
}

export function subscribeToRoomGames(gameIds: string[], callback: (games: IGameState[]) => void) {
  const unsubscribers: (() => void)[] = [];
  const gamesMap: { [id: string]: IGameState } = {};

  gameIds.forEach((gameId) => {
    const unsub = subscribeToGame(gameId, (game) => {
      if (game) {
        gamesMap[gameId] = game;
      }
      const allGames = gameIds
        .map((id) => gamesMap[id])
        .filter(Boolean)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(allGames);
    });
    unsubscribers.push(unsub);
  });

  return () => unsubscribers.forEach((unsub) => unsub());
}
