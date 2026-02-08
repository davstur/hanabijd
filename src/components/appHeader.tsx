import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "~/components/languageSelector";
import PlayerAvatar, { AvatarSize } from "~/components/playerAvatar";
import Txt, { TxtSize } from "~/components/ui/txt";

export default function AppHeader() {
  const router = useRouter();
  const { t } = useTranslation();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const gameId = router.query.gameId as string | undefined;

  if (router.pathname === "/") return null;
  if (!roomId && !playerName && !gameId) return null;

  function handleLogout() {
    localStorage.removeItem("name");
    localStorage.removeItem("currentRoom");
    localStorage.removeItem("playerId");
    localStorage.removeItem("gameId");
    router.push("/");
  }

  return (
    <div className="flex items-center justify-between pv2 ph3 bb b--yellow-light">
      {gameId ? (
        <span className="flex items-center">
          <Txt className="ttu txt-yellow mr2" size={TxtSize.SMALL} value={t("game")} />
          <Txt size={TxtSize.SMALL} value={gameId} />
        </span>
      ) : roomId ? (
        <a className="pointer no-underline flex items-center" onClick={() => router.push(`/rooms/${roomId}`)}>
          <Txt className="ttu txt-yellow mr2" size={TxtSize.SMALL} value={t("room")} />
          <Txt size={TxtSize.SMALL} value={roomId} />
        </a>
      ) : (
        <div />
      )}
      <div className="flex items-center">
        {!playerName && <LanguageSelector outlined />}
        {playerName && (
          <div ref={menuRef} className="relative ml2">
            <span className="pointer" onClick={() => setShowMenu(!showMenu)}>
              <PlayerAvatar name={playerName} size={AvatarSize.MEDIUM} />
            </span>
            {showMenu && (
              <div
                className="absolute right-0 mt1 pa2 br2 shadow-1 z-999"
                style={{ background: "#1a1a3e", border: "1px solid rgba(255,255,255,0.15)", minWidth: "6rem" }}
              >
                <span className="db pa1 mb1 hover-bg-white-10 br1">
                  <LanguageSelector outlined />
                </span>
                <span className="pointer db pa1 hover-bg-white-10 br1" onClick={handleLogout}>
                  <Txt size={TxtSize.XSMALL} value={t("logout")} />
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
