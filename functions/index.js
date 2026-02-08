const functions = require("firebase-functions");
const admin = require("firebase-admin");
const webpush = require("web-push");

admin.initializeApp();

// Configure VAPID keys from Firebase environment config
// Set via: firebase functions:config:set vapid.public_key="..." vapid.private_key="..." vapid.email="..."
const vapidConfig = functions.config().vapid || {};

if (vapidConfig.public_key && vapidConfig.private_key) {
  webpush.setVapidDetails(
    `mailto:${vapidConfig.email || "noreply@hanab.cards"}`,
    vapidConfig.public_key,
    vapidConfig.private_key
  );
}

/**
 * Send push notification to a specific player
 */
async function sendPushToPlayer(playerId, payload) {
  const db = admin.database();
  const snapshot = await db.ref(`/pushSubscriptions/${playerId}`).once("value");
  const sub = snapshot.val();

  if (!sub || !sub.endpoint || !sub.keys) return;

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: sub.keys,
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      // Subscription expired or invalid — clean up
      await db.ref(`/pushSubscriptions/${playerId}`).remove();
    } else {
      console.error(`Push failed for ${playerId}:`, err.message);
    }
  }
}

/**
 * Notify room members when a new game is added to a room.
 *
 * Triggers when /rooms/{roomId}/gameIds changes.
 */
exports.onNewGameInRoom = functions.database
  .ref("/rooms/{roomId}/gameIds")
  .onWrite(async (change, context) => {
    const { roomId } = context.params;

    const before = change.before.val() || [];
    const after = change.after.val() || [];

    // Find newly added game IDs
    const newGameIds = after.filter((id) => !before.includes(id));
    if (newGameIds.length === 0) return;

    // Get room data for member list
    const roomSnapshot = await admin.database().ref(`/rooms/${roomId}`).once("value");
    const room = roomSnapshot.val();
    if (!room || !room.members) return;

    const memberIds = Object.keys(room.members);

    // Send notification to each member
    const payload = {
      title: "Hanab",
      body: `New game created in room ${roomId}`,
      url: `/rooms/${roomId}`,
      tag: `room-${roomId}-new-game`,
    };

    await Promise.all(memberIds.map((memberId) => sendPushToPlayer(memberId, payload)));
  });

/**
 * Notify game players when a turn is played.
 *
 * Triggers when /games/{gameId}/turnsHistory changes.
 */
exports.onTurnPlayed = functions.database
  .ref("/games/{gameId}/turnsHistory")
  .onWrite(async (change, context) => {
    const { gameId } = context.params;

    const before = change.before.val() || [];
    const after = change.after.val() || [];

    // Only notify on new turns, not rollbacks
    if (after.length <= before.length) return;

    // Get the latest turn to find who played
    const latestTurn = after[after.length - 1];
    const fromPlayerIndex = latestTurn?.action?.from;

    // Get game data for player list
    const gameSnapshot = await admin.database().ref(`/games/${gameId}`).once("value");
    const game = gameSnapshot.val();
    if (!game || !game.players) return;

    // Find who played the turn (to exclude them from notification)
    const fromPlayer = typeof fromPlayerIndex === "number" ? game.players[fromPlayerIndex] : null;

    // Determine the current player (whose turn it is now)
    const currentPlayerIndex = game.currentPlayer;
    const currentPlayer = typeof currentPlayerIndex === "number" ? game.players[currentPlayerIndex] : null;

    // Build notification for each player except the one who just played
    const notifications = game.players
      .filter((player) => player && !player.bot)
      .filter((player) => !fromPlayer || player.id !== fromPlayer.id)
      .map((player) => {
        const isYourTurn = currentPlayer && player.id === currentPlayer.id;
        const body = isYourTurn ? `It's your turn in ${gameId}` : `A turn was played in ${gameId}`;

        return sendPushToPlayer(player.id, {
          title: "Hanab",
          body,
          url: `/games/${gameId}`,
          tag: `game-${gameId}-turn`,
        });
      });

    await Promise.all(notifications);
  });
