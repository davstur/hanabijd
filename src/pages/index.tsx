import Head from "next/head";
import Image from "next/legacy/image";
import { useRouter } from "next/router";
import React, { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector, { Languages } from "~/components/languageSelector";
import Button, { ButtonSize } from "~/components/ui/button";
import { TextInput } from "~/components/ui/forms";
import Txt, { TxtSize } from "~/components/ui/txt";
import { createRoom, joinRoom as joinRoomDb, loadRoom, IRoomMember } from "~/lib/firebase";
import { readableRoomId, uniqueId } from "~/lib/id";

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

  function ensureName(action: "create" | "join") {
    if (!playerName.trim()) {
      setNeedsName(true);
      setPendingAction(action);
      return false;
    }
    return true;
  }

  async function handleCreateRoom() {
    if (!ensureName("create")) return;

    const roomId = readableRoomId();
    const member: IRoomMember = {
      id: getPlayerId(),
      name: playerName.trim(),
      joinedAt: Date.now(),
    };
    await createRoom(roomId, member);
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
      id: getPlayerId(),
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
    if (pendingAction === "create") {
      handleCreateRoom();
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
        ) : (
          <main className="flex flex-column mt5 items-center">
            <Button
              primary
              className="mb4"
              size={ButtonSize.LARGE}
              text={t("createRoom", "Create a room")}
              onClick={handleCreateRoom}
            />

            {showJoinForm ? (
              <form className="flex flex-column items-center" onSubmit={handleJoinRoom}>
                <div className="flex items-center mb2">
                  <TextInput
                    autoFocus
                    className="mr2"
                    placeholder={t("roomCode", "Room code")}
                    style={{ width: "14rem" }}
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value);
                      setError(null);
                    }}
                  />
                  <Button size={ButtonSize.MEDIUM} text={t("joinRoom", "Join a room")} />
                </div>
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
