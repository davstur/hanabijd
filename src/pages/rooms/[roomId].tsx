import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "~/components/playerAvatar";
import Button, { ButtonSize } from "~/components/ui/button";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useRequireName } from "~/hooks/useRequireName";
import {
  IRoom,
  IRoomMember,
  addGameToRoom,
  subscribeToRoom,
  subscribeToRoomGames,
  joinRoom as joinRoomDb,
} from "~/lib/firebase";
import { readableUniqueId } from "~/lib/id";
import { newMagicLobby } from "~/lib/magic/actions";
import { subscribeToMagicGame, updateMagicGame } from "~/lib/magic/firebase";
import IMagicGameState, { MagicGameStatus } from "~/lib/magic/state";
import IGameState, { GameMode, GameVariant, IGameStatus, RoomGameType } from "~/lib/state";

const NAME_KEY = "name";
const ROOM_KEY = "currentRoom";

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

function MagicGameStatusBadge({ game }: { game: IMagicGameState }) {
  const { t } = useTranslation();

  if (game.status === MagicGameStatus.LOBBY) {
    const joined = game.players.length;
    const needed = game.options.playersCount;
    return (
      <div className="flex items-center">
        <Txt
          className="txt-yellow mr2"
          size={TxtSize.XSMALL}
          value={t("waitingForPlayers", `Waiting (${joined}/${needed})`)}
        />
        <Txt className="lavender" size={TxtSize.XSMALL} value="Magic" />
      </div>
    );
  }

  if (game.status === MagicGameStatus.ONGOING) {
    const lifeSummary = game.players.map((p) => `${p.name}: ${p.life}`).join(" / ");
    return (
      <div className="flex items-center">
        <Txt className="light-green mr2" size={TxtSize.XSMALL} value={t("inProgress")} />
        <Txt className="lavender" size={TxtSize.XSMALL} value={lifeSummary} />
      </div>
    );
  }

  if (game.status === MagicGameStatus.OVER) {
    return (
      <div className="flex items-center">
        <Txt className="lavender" size={TxtSize.XSMALL} value={t("finished")} />
      </div>
    );
  }

  return null;
}

export default function RoomPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const { t } = useTranslation();
  useRequireName();

  const [room, setRoom] = useState<IRoom | null>(null);
  const [games, setGames] = useState<IGameState[]>([]);
  const [magicGames, setMagicGames] = useState<IMagicGameState[]>([]);
  const [loading, setLoading] = useState(true);

  const isMagic = (room?.gameType || RoomGameType.HANABI) === RoomGameType.MAGIC;

  // Subscribe to room data
  useEffect(() => {
    if (!roomId || typeof roomId !== "string") return;

    const unsub = subscribeToRoom(roomId, (roomData) => {
      setRoom(roomData);
      setLoading(false);

      // Auto-join room if not already a member
      if (roomData) {
        const name = getPlayerName();
        const members = roomData.members || {};
        if (name && !members[name]) {
          const member: IRoomMember = {
            name,
            joinedAt: Date.now(),
          };
          joinRoomDb(roomId, member);
        }
        // Store room in localStorage
        localStorage.setItem(ROOM_KEY, JSON.stringify(roomId));
      }
    });

    return unsub;
  }, [roomId]);

  // Subscribe to Hanabi games
  useEffect(() => {
    if (isMagic) return;
    if (!room || !room.gameIds || room.gameIds.length === 0) {
      setGames([]);
      return;
    }
    return subscribeToRoomGames(room.gameIds, setGames);
  }, [room?.gameIds?.length, isMagic]);

  // Subscribe to Magic games
  useEffect(() => {
    if (!isMagic) return;
    if (!room || !room.gameIds || room.gameIds.length === 0) {
      setMagicGames([]);
      return;
    }

    const unsubscribers: (() => void)[] = [];
    const gamesMap: { [id: string]: IMagicGameState } = {};

    for (const gameId of room.gameIds) {
      const unsub = subscribeToMagicGame(gameId, (game) => {
        if (game) {
          gamesMap[gameId] = game;
        }
        const allGames = room.gameIds
          .map((id) => gamesMap[id])
          .filter(Boolean)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMagicGames(allGames);
      });
      unsubscribers.push(unsub);
    }

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [room?.gameIds?.length, isMagic]);

  async function handleCreateGame() {
    if (isMagic) {
      const gameId = readableUniqueId();
      const lobby = newMagicLobby(gameId, 2, 20, GameMode.NETWORK);
      await updateMagicGame(lobby);
      await addGameToRoom(roomId, gameId);
      router.push(`/magic/${gameId}`);
    } else {
      router.push(`/new-game?room=${roomId}`);
    }
  }

  function handleJoinGame(gameId: string) {
    if (isMagic) {
      router.push(`/magic/${gameId}`);
    } else {
      router.push(`/games/${gameId}`);
    }
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
  const displayGames = isMagic ? magicGames : games;

  return (
    <div
      className="w-100 min-vh-100 flex flex-column bg-main-dark pa3 pa4-l"
      style={{
        backgroundImage: "linear-gradient(to bottom right, #001030, #00133d)",
      }}
    >
      {/* Room header */}
      <div className="mb3 flex items-center justify-between">
        <Txt className="lavender" size={TxtSize.SMALL} value={isMagic ? "Magic: The Gathering" : "Hanab"} />
        <Button
          void
          size={ButtonSize.TINY}
          text={t("leaveRoom", "Leave")}
          onClick={() => {
            localStorage.removeItem(ROOM_KEY);
            router.push("/");
          }}
        />
      </div>

      {/* Members */}
      <div className="mb4">
        <Txt className="ttu mb2 db" size={TxtSize.SMALL} value={t("members")} />
        {members.map((member) => (
          <span key={member.name} className="mb1 flex items-center lavender">
            <PlayerAvatar className="mr2" name={member.name} />
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
        {displayGames.length === 0 && (
          <Txt className="lavender" size={TxtSize.SMALL} value={t("noGamesYet", "No games yet. Create one!")} />
        )}
        {!isMagic &&
          (games as IGameState[]).map((game) => (
            <div
              key={game.id}
              className="flex justify-between items-center mb2 pa2 br2 pointer hover-bg-white-10"
              style={{ background: "rgba(255,255,255,0.05)" }}
              onClick={() => handleJoinGame(game.id)}
            >
              <div className="flex items-center">
                <div className="flex items-center mr2" style={{ gap: 4 }}>
                  {game.players.length > 0 ? (
                    game.players.map((p) => <PlayerAvatar key={p.name} name={p.name} />)
                  ) : (
                    <Txt size={TxtSize.SMALL} value="..." />
                  )}
                </div>
                <GameStatusBadge game={game} />
              </div>
              <div className="flex items-center">
                {game.status === IGameStatus.LOBBY && <Button size={ButtonSize.TINY} text={t("join", "Join")} />}
                {game.status === IGameStatus.ONGOING && (
                  <Button
                    size={ButtonSize.TINY}
                    text={game.players.some((p) => p.name === getPlayerName()) ? t("rejoinGame") : t("watch")}
                  />
                )}
                {game.status === IGameStatus.OVER && <Button size={ButtonSize.TINY} text={t("view", "View")} />}
              </div>
            </div>
          ))}
        {isMagic &&
          magicGames.map((game) => (
            <div
              key={game.id}
              className="flex justify-between items-center mb2 pa2 br2 pointer hover-bg-white-10"
              style={{ background: "rgba(255,255,255,0.05)" }}
              onClick={() => handleJoinGame(game.id)}
            >
              <div className="flex items-center">
                <div className="flex items-center mr2" style={{ gap: 4 }}>
                  {game.players.length > 0 ? (
                    game.players.map((p) => <PlayerAvatar key={p.name} name={p.name} />)
                  ) : (
                    <Txt size={TxtSize.SMALL} value="..." />
                  )}
                </div>
                <MagicGameStatusBadge game={game} />
              </div>
              <div className="flex items-center">
                {game.status === MagicGameStatus.LOBBY && <Button size={ButtonSize.TINY} text={t("join", "Join")} />}
                {game.status === MagicGameStatus.ONGOING && (
                  <Button
                    size={ButtonSize.TINY}
                    text={game.players.some((p) => p.name === getPlayerName()) ? t("rejoinGame") : t("watch")}
                  />
                )}
                {game.status === MagicGameStatus.OVER && <Button size={ButtonSize.TINY} text={t("view", "View")} />}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
