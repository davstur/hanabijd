import classnames from "classnames";
import Head from "next/head";
import Image from "next/legacy/image";
import { useRouter } from "next/router";
import React, { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector, { Languages } from "~/components/languageSelector";
import Button, { ButtonSize } from "~/components/ui/button";
import { TextInput } from "~/components/ui/forms";
import Txt, { TxtSize } from "~/components/ui/txt";
import { addGameToRoom, createRoom, joinRoom as joinRoomDb, loadRoom, IRoomMember } from "~/lib/firebase";
import { readableRoomId, readableUniqueId } from "~/lib/id";
import { newMagicLobby } from "~/lib/magic/actions";
import { updateMagicGame } from "~/lib/magic/firebase";
import { GameMode, RoomGameType } from "~/lib/state";

const NAME_KEY = "name";
const ROOM_KEY = "currentRoom";

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [pendingAction, setPendingAction] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showGameTypeSelect, setShowGameTypeSelect] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedRoom = localStorage.getItem(ROOM_KEY);
    if (storedRoom) {
      try {
        const room = JSON.parse(storedRoom);
        if (room) {
          setCurrentRoom(room);
          router.replace(`/rooms/${room}`);
        }
      } catch {
        // invalid stored value, ignore
      }
    }
    const storedName = localStorage.getItem(NAME_KEY);
    if (storedName) {
      try {
        setPlayerName(JSON.parse(storedName));
      } catch {
        setPlayerName(storedName);
      }
    }
  }, [router]);

  function ensureName(action: "create" | "join") {
    if (!playerName.trim()) {
      setNeedsName(true);
      setPendingAction(action);
      return false;
    }
    return true;
  }

  function handleCreateRoomClick() {
    if (!ensureName("create")) return;
    setShowGameTypeSelect(true);
  }

  async function handleCreateRoom(gameType: RoomGameType) {
    const roomId = readableRoomId();
    const member: IRoomMember = {
      name: playerName.trim(),
      joinedAt: Date.now(),
    };
    await createRoom(roomId, member, gameType);
    localStorage.setItem(NAME_KEY, JSON.stringify(playerName.trim()));
    localStorage.setItem(ROOM_KEY, JSON.stringify(roomId));
    router.push(`/rooms/${roomId}`);
  }

  async function handleJoinRoom(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!ensureName("join")) return;

    const code = joinCode.trim();
    if (!code) {
      setError(t("enterRoomCode", "Please enter a room code"));
      return;
    }

    const room = await loadRoom(code);
    if (!room) {
      setError(t("roomNotFound", "Room not found"));
      return;
    }

    const member: IRoomMember = {
      name: playerName.trim(),
      joinedAt: Date.now(),
    };
    await joinRoomDb(code, member);
    localStorage.setItem(NAME_KEY, JSON.stringify(playerName.trim()));
    localStorage.setItem(ROOM_KEY, JSON.stringify(code));
    router.push(`/rooms/${code}`);
  }

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    if (!playerName.trim()) return;
    setNeedsName(false);
    if (pendingAction === "create") {
      setShowGameTypeSelect(true);
    } else if (pendingAction === "join") {
      handleJoinRoom();
    }
  }

  if (currentRoom) {
    return null;
  }

  return (
    <div
      className="relative w-100 flex flex-column items-center pa2 pv4-l ph3-l"
      style={{
        backgroundImage: "linear-gradient(to bottom right, #001030, #00133d)",
        height: "100%",
      }}
    >
      <Head>
        <title>Hanab</title>
        <link href="/" hrefLang="x-default" rel="alternate" />
        {Object.keys(Languages).map((locale) => (
          <link key={locale} href={`/${locale}`} hrefLang={locale} rel="alternate" />
        ))}
      </Head>
      <div className="absolute top-1 right-2">
        <LanguageSelector outlined />
      </div>
      <div className="flex-1 flex flex-column items-center justify-center">
        <div className="flex flex-column items-center">
          <div className="mb4 w4 h4">
            <Image
              alt={t("landingImageAlt", "Hanab cards game online logo")}
              height={256}
              priority={true}
              src={"/static/hanab.png"}
              width={256}
            />
          </div>
          <Txt size={TxtSize.LARGE} value={t("hanab", "Hanab")} />
        </div>
        <span className="tc lavender mt2">{t("tagline", "Play the Hanab game online with friends!")}</span>

        {needsName ? (
          <form className="flex flex-column items-center mt5" onSubmit={handleNameSubmit}>
            <Txt className="mb3" size={TxtSize.MEDIUM} value={t("choosePlayerName", "Choose your player name")} />
            <div className="flex items-center">
              <TextInput
                autoFocus
                className="mr2"
                style={{ width: "12rem" }}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <Button primary disabled={!playerName.trim()} text={t("confirm", "OK")} />
            </div>
          </form>
        ) : showGameTypeSelect ? (
          <div className="flex flex-column items-center mt5">
            <Txt className="mb4" size={TxtSize.MEDIUM} value={t("whatToPlay", "What do you want to play?")} />
            <div className="flex items-center" style={{ gap: "1rem" }}>
              <button
                className={classnames(
                  "pointer br3 pa3 ph4 shadow-2 bn flex flex-column items-center grow",
                  "bg-cta main-dark"
                )}
                onClick={() => handleCreateRoom(RoomGameType.HANABI)}
              >
                <span className="f2 mb2">🎆</span>
                <Txt size={TxtSize.MEDIUM} value="Hanab" />
                <span className="f7 mt1 o-80">{t("cooperative", "Cooperative card game")}</span>
              </button>
              <button
                className={classnames(
                  "pointer br3 pa3 ph4 shadow-2 bn flex flex-column items-center grow",
                  "bg-cta main-dark"
                )}
                onClick={async () => {
                  const roomId = readableRoomId();
                  const gameId = readableUniqueId();
                  const member: IRoomMember = {
                    name: playerName.trim(),
                    joinedAt: Date.now(),
                  };

                  // Create room, game lobby, and link them
                  await createRoom(roomId, member, RoomGameType.MAGIC);
                  const lobby = newMagicLobby(gameId, 2, 20, GameMode.NETWORK);
                  await updateMagicGame(lobby);
                  await addGameToRoom(roomId, gameId);

                  localStorage.setItem(NAME_KEY, JSON.stringify(playerName.trim()));
                  localStorage.setItem(ROOM_KEY, JSON.stringify(roomId));
                  router.push(`/magic/${gameId}`);
                }}
              >
                <span className="f2 mb2">🧙</span>
                <Txt size={TxtSize.MEDIUM} value="Magic" />
                <span className="f7 mt1 o-80">{t("magicSubtitle", "The Gathering")}</span>
              </button>
            </div>
            <Button
              void
              className="mt4"
              size={ButtonSize.SMALL}
              text={`< ${t("back", "Back")}`}
              onClick={() => setShowGameTypeSelect(false)}
            />
          </div>
        ) : (
          <main className="flex flex-column mt5 items-center">
            {!showJoinForm && (
              <Button
                primary
                className="mb4"
                size={ButtonSize.LARGE}
                text={t("createRoom", "Create a room")}
                onClick={handleCreateRoomClick}
              />
            )}

            {showJoinForm ? (
              <form className="flex flex-column items-center" onSubmit={handleJoinRoom}>
                <TextInput
                  autoFocus
                  className="mb3"
                  placeholder={t("roomCode", "Room code")}
                  style={{ width: "14rem" }}
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value);
                    setError(null);
                  }}
                />
                <Button primary size={ButtonSize.MEDIUM} text={t("joinRoom", "Join a room")} />
                {error && <Txt className="red mt1" size={TxtSize.SMALL} value={error} />}
              </form>
            ) : (
              <Button
                size={ButtonSize.MEDIUM}
                text={t("joinRoom", "Join a room")}
                onClick={() => setShowJoinForm(true)}
              />
            )}
          </main>
        )}
      </div>
      <div className="tc w-100 pb1">
        <span className="lavender f7">
          {"This builds on "}
          <a
            className="lavender underline"
            href="https://github.com/bstnfrmry/hanabi"
            rel="noopener noreferrer"
            target="_blank"
          >
            github.com/bstnfrmry/hanabi
          </a>
          {" \ud83d\ude4f"}
        </span>
      </div>
    </div>
  );
}
