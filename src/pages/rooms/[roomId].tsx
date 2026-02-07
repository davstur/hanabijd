import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Button, { ButtonSize } from "~/components/ui/button";
import Txt, { TxtSize } from "~/components/ui/txt";
import useLocalStorage from "~/hooks/localStorage";
import {
  IRoom,
  IRoomMember,
  leaveRoom,
  subscribeToRoom,
  subscribeToRoomGames,
  joinRoom as joinRoomDb,
} from "~/lib/firebase";
import IGameState, { GameVariant, IGameStatus } from "~/lib/state";
import { getMaximumScore, getScore } from "~/lib/actions";
import { uniqueId } from "~/lib/id";
import { getNotificationPermission, isPushSupported, subscribeToPush } from "~/lib/notifications";

const NAME_KEY = "name";
const ROOM_KEY = "currentRoom";

function getPlayerId(): string {
  if (typeof window === "undefined") return uniqueId();
  let id = localStorage.getItem("playerId");
  if (id) {
    try {
      return JSON.parse(id);
    } catch {
      return id;
    }
  }
  id = uniqueId();
  localStorage.setItem("playerId", JSON.stringify(id));
  return id;
}

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

const VariantKeys: Record<string, string> = {
  [GameVariant.CLASSIC]: "classicVariant",
  [GameVariant.MULTICOLOR]: "multicolorVariant",
  [GameVariant.RAINBOW]: "rainbowVariant",
  [GameVariant.CRITICAL_RAINBOW]: "criticalRainbowVariant",
  [GameVariant.ORANGE]: "orangeVariant",
  [GameVariant.SEQUENCE]: "sequenceVariant",
};

function GameStatusBadge({ game }: { game: IGameState }) {
  const { t } = useTranslation();
  const variant = game.options.variant || GameVariant.CLASSIC;
  const variantLabel = t(VariantKeys[variant] || "classicVariant");
  const maxScore = getMaximumScore(game);

  if (game.status === IGameStatus.LOBBY) {
    const joined = game.players.length;
    const needed = game.options.playersCount;
    return (
      <div className="flex items-center">
        <Txt
          className="txt-yellow mr2"
          size={TxtSize.XSMALL}
          value={t("waitingForPlayers", `Waiting (${joined}/${needed})`)}
        />
        <Txt className="lavender" size={TxtSize.XSMALL} value={variantLabel} />
      </div>
    );
  }

  if (game.status === IGameStatus.ONGOING) {
    const score = getScore(game);
    return (
      <div className="flex items-center">
        <Txt className="light-green mr2" size={TxtSize.XSMALL} value={`${t("inProgress")} · ${score}/${maxScore}`} />
        <Txt className="lavender" size={TxtSize.XSMALL} value={variantLabel} />
      </div>
    );
  }

  if (game.status === IGameStatus.OVER) {
    const score = getScore(game);
    return (
      <div className="flex items-center">
        <Txt className="lavender mr2" size={TxtSize.XSMALL} value={`${t("finished")} · ${score}/${maxScore}`} />
        <Txt className="lavender" size={TxtSize.XSMALL} value={variantLabel} />
      </div>
    );
  }

  return null;
}

export default function RoomPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const { t } = useTranslation();

  const [room, setRoom] = useState<IRoom | null>(null);
  const [games, setGames] = useState<IGameState[]>([]);
  const [, setCurrentRoom] = useLocalStorage<string | null>(ROOM_KEY, null);
  const [loading, setLoading] = useState(true);
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    setNotifSupported(isPushSupported());
    setNotifEnabled(getNotificationPermission() === "granted");
  }, []);

  async function handleNotifToggle() {
    if (notifEnabled) return;
    const success = await subscribeToPush();
    setNotifEnabled(success);
  }

  // Subscribe to room data
  useEffect(() => {
    if (!roomId || typeof roomId !== "string") return;

    const unsub = subscribeToRoom(roomId, (roomData) => {
      setRoom(roomData);
      setLoading(false);

      // Auto-join room if not already a member
      if (roomData) {
        const playerId = getPlayerId();
        const members = roomData.members || {};
        if (!members[playerId]) {
          const name = getPlayerName();
          if (name) {
            const member: IRoomMember = {
              id: playerId,
              name,
              joinedAt: Date.now(),
            };
            joinRoomDb(roomId, member);
          }
        }
        // Store room in localStorage
        localStorage.setItem(ROOM_KEY, JSON.stringify(roomId));
      }
    });

    return unsub;
  }, [roomId]);

  // Subscribe to games in the room
  useEffect(() => {
    if (!room || !room.gameIds || room.gameIds.length === 0) {
      setGames([]);
      return;
    }

    return subscribeToRoomGames(room.gameIds, setGames);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.gameIds?.length]);

  async function handleLeaveRoom() {
    if (!roomId || typeof roomId !== "string") return;
    const playerId = getPlayerId();
    await leaveRoom(roomId, playerId);
    setCurrentRoom(null);
    localStorage.removeItem(ROOM_KEY);
    router.push("/");
  }

  function handleCreateGame() {
    router.push(`/new-game?room=${roomId}`);
  }

  function handleJoinGame(gameId: string) {
    router.push(`/games/${gameId}`);
  }

  if (loading) {
    return (
      <div className="w-100 h-100 flex justify-center items-center bg-main-dark">
        <Txt size={TxtSize.MEDIUM} value={t("loading", "Loading...")} />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="w-100 h-100 flex flex-column justify-center items-center bg-main-dark">
        <Txt className="mb4" size={TxtSize.MEDIUM} value={t("roomNotFound", "Room not found")} />
        <Button
          primary
          size={ButtonSize.MEDIUM}
          text={t("backMenu", "Back to menu")}
          onClick={() => router.push("/")}
        />
      </div>
    );
  }

  const members = room.members ? Object.values(room.members) : [];

  return (
    <div
      className="w-100 min-vh-100 flex flex-column bg-main-dark pa3 pa4-l"
      style={{
        backgroundImage: "linear-gradient(to bottom right, #001030, #00133d)",
      }}
    >
      {/* Notification + Leave room */}
      <div className="flex justify-between items-center mb3">
        <div className="flex items-center">
          {notifSupported && (
            <label className="flex items-center pointer">
              <Txt className="mr2" size={TxtSize.XSMALL} value={t("notifications")} />
              <div
                className="relative br-pill"
                style={{
                  width: 36,
                  height: 20,
                  background: notifEnabled ? "#19a974" : "rgba(255,255,255,0.2)",
                  transition: "background 0.2s",
                }}
                onClick={handleNotifToggle}
              >
                <div
                  className="absolute br-100 bg-white"
                  style={{
                    width: 16,
                    height: 16,
                    top: 2,
                    left: notifEnabled ? 18 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </div>
            </label>
          )}
        </div>
        <Button outlined size={ButtonSize.TINY} text={t("leave", "Leave")} onClick={handleLeaveRoom} />
      </div>

      {/* Members */}
      <div className="mb4">
        <Txt className="ttu mb2 db" size={TxtSize.SMALL} value={t("members")} />
        {members.map((member) => (
          <span key={member.id} className="mb1 db lavender">
            <Txt size={TxtSize.SMALL} value={member.name} />
          </span>
        ))}
      </div>

      {/* Create Game */}
      <div className="mb4">
        <Button primary size={ButtonSize.MEDIUM} text={t("newGame", "New game")} onClick={handleCreateGame} />
      </div>

      {/* Games List */}
      <div>
        <Txt className="ttu mb3 db" size={TxtSize.SMALL} value={t("games", "Games")} />
        {games.length === 0 && (
          <Txt className="lavender" size={TxtSize.SMALL} value={t("noGamesYet", "No games yet. Create one!")} />
        )}
        {games.map((game) => (
          <div
            key={game.id}
            className="flex justify-between items-center mb2 pa2 br2 pointer hover-bg-white-10"
            style={{ background: "rgba(255,255,255,0.05)" }}
            onClick={() => handleJoinGame(game.id)}
          >
            <div className="flex items-center">
              <Txt className="mr2" size={TxtSize.SMALL} value={game.players.map((p) => p.name).join(", ") || "..."} />
              <GameStatusBadge game={game} />
            </div>
            <div className="flex items-center">
              {game.status === IGameStatus.LOBBY && <Button size={ButtonSize.TINY} text={t("join", "Join")} />}
              {game.status === IGameStatus.ONGOING && (
                <Button
                  size={ButtonSize.TINY}
                  text={game.players.some((p) => p.id === getPlayerId()) ? t("rejoinGame") : t("watch")}
                />
              )}
              {game.status === IGameStatus.OVER && <Button size={ButtonSize.TINY} text={t("view", "View")} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
