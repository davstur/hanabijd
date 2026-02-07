import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "~/components/languageSelector";
import Button, { ButtonSize } from "~/components/ui/button";
import Txt, { TxtSize } from "~/components/ui/txt";

export default function AppHeader() {
  const router = useRouter();
  const { t } = useTranslation();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawRoom = localStorage.getItem("currentRoom");
      setRoomId(rawRoom ? JSON.parse(rawRoom) : null);
    } catch {
      setRoomId(null);
    }

    try {
      const rawName = localStorage.getItem("name");
      setPlayerName(rawName ? JSON.parse(rawName) : null);
    } catch {
      setPlayerName(null);
    }
  }, [router.asPath]);

  if (router.pathname === "/") return null;
  if (!roomId && !playerName) return null;

  function handleLogout() {
    localStorage.removeItem("name");
    localStorage.removeItem("currentRoom");
    localStorage.removeItem("playerId");
    localStorage.removeItem("gameId");
    router.push("/");
  }

  return (
    <div className="flex items-center justify-between pv2 ph3 bb b--yellow-light">
      {roomId ? (
        <a className="pointer no-underline flex items-center" onClick={() => router.push(`/rooms/${roomId}`)}>
          <Txt className="ttu txt-yellow mr2" size={TxtSize.SMALL} value={t("room")} />
          <Txt size={TxtSize.SMALL} value={roomId} />
        </a>
      ) : (
        <div />
      )}
      <div className="flex items-center">
        <LanguageSelector outlined />
        {playerName && <Txt className="mh2" size={TxtSize.XSMALL} value={playerName} />}
        <Button void size={ButtonSize.TINY} text={t("logout")} onClick={handleLogout} />
      </div>
    </div>
  );
}
