/**
 * One-time migration script to backfill the /playerRooms index
 * from existing /rooms data. Idempotent (safe to re-run), but will
 * overwrite joinedAt timestamps from room member data.
 *
 * Usage:
 *   npx tsx scripts/backfill-player-rooms.ts
 *
 * Requires either:
 *   - NEXT_PUBLIC_FIREBASE_DATABASE_URL alone (local emulator), or
 *   - The full set of NEXT_PUBLIC_FIREBASE_* env vars (production)
 *
 * Reads .env via dotenv.
 */

import { config } from "dotenv";
config();

import firebase from "firebase/app";
import "firebase/database";

function initFirebase() {
  if (firebase.apps.length) return firebase.database();

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

  return firebase.database();
}

async function main() {
  const db = initFirebase();

  console.log("Reading all rooms...");
  const roomsSnapshot = await db.ref("/rooms").once("value");
  const rooms = roomsSnapshot.val();

  if (!rooms) {
    console.log("No rooms found.");
    process.exit(0);
  }

  const roomIds = Object.keys(rooms);
  console.log(`Found ${roomIds.length} rooms. Backfilling player-room index...`);

  let entriesWritten = 0;
  let failures = 0;

  for (const roomId of roomIds) {
    const room = rooms[roomId];
    if (!room || typeof room.members !== "object") {
      console.warn(`Skipping room ${roomId}: no valid members`);
      continue;
    }
    const members = room.members;
    const gameType = room.gameType || "hanabi";

    for (const memberName of Object.keys(members)) {
      try {
        const member = members[memberName];
        const entry = {
          roomId,
          joinedAt: member.joinedAt || room.createdAt || Date.now(),
          gameType,
        };
        await db.ref(`/playerRooms/${memberName}/${roomId}`).set(entry);
        entriesWritten++;
      } catch (err) {
        console.error(`Failed to write index for ${memberName} in room ${roomId}:`, err);
        failures++;
      }
    }
  }

  console.log(`Done. Wrote ${entriesWritten} entries, ${failures} failures.`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
