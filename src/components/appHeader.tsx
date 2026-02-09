import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "~/components/languageSelector";
import PlayerAvatar, { AvatarSize } from "~/components/playerAvatar";
import Txt, { TxtSize } from "~/components/ui/txt";
import { leaveRoom } from "~/lib/firebase";
import { isPushSubscribed, isPushSupported, subscribeToPush, unsubscribeFromPush } from "~/lib/notifications";

export default function AppHeader() {
  const router = useRouter();
  const { t } = useTranslation();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showLeftMenu, setShowLeftMenu] = useState(false);
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const leftMenuRef = useRef<HTMLDivElement>(null);

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
    setNotifSupported(isPushSupported());
    isPushSubscribed().then(setNotifEnabled);
  }, []);

  useEffect(() => {
    if (!showMenu && !showLeftMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (showLeftMenu && leftMenuRef.current && !leftMenuRef.current.contains(e.target as Node)) {
        setShowLeftMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu, showLeftMenu]);

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

  async function handleLeaveRoom() {
    if (!roomId || !playerName) return;
    await leaveRoom(roomId, playerName);
    localStorage.removeItem("currentRoom");
    setShowLeftMenu(false);
    router.push("/");
  }

  function handleLeaveGame() {
    setShowLeftMenu(false);
    if (roomId) {
      router.push(`/rooms/${roomId}`);
    } else {
      router.push("/");
    }
  }

  async function handleNotifToggle() {
    if (notifEnabled) {
      const success = await unsubscribeFromPush();
      if (success) setNotifEnabled(false);
    } else {
      const success = await subscribeToPush();
      setNotifEnabled(success);
    }
  }

  const isGamePage = !!gameId;
  const isLandscapeSidebar = isGamePage;

  const leftNavContent = gameId ? (
    <div ref={leftMenuRef} className="relative">
      <span className="pointer flex items-center" onClick={() => setShowLeftMenu(!showLeftMenu)}>
        <Txt className="ttu txt-yellow landscape-sidebar-hide-name" size={TxtSize.SMALL} value={t("game")} />
        <Txt className="landscape-sidebar-hide" size={TxtSize.SMALL} value={gameId} />
      </span>
      {showLeftMenu && (
        <div
          className="absolute left-0 mt1 pa2 br2 shadow-1 z-999 landscape-sidebar-menu"
          style={{ background: "#1a1a3e", border: "1px solid rgba(255,255,255,0.15)", minWidth: "6rem" }}
        >
          <span className="pointer db pa1 hover-bg-white-10 br1" onClick={handleLeaveGame}>
            <Txt size={TxtSize.XSMALL} value={t("leaveGame", "Leave game")} />
          </span>
        </div>
      )}
    </div>
  ) : roomId ? (
    <div ref={leftMenuRef} className="relative">
      <span className="pointer flex items-center" onClick={() => setShowLeftMenu(!showLeftMenu)}>
        <Txt className="ttu txt-yellow mr2" size={TxtSize.SMALL} value={t("room")} />
        <Txt size={TxtSize.SMALL} value={roomId} />
      </span>
      {showLeftMenu && (
        <div
          className="absolute left-0 mt1 pa2 br2 shadow-1 z-999"
          style={{ background: "#1a1a3e", border: "1px solid rgba(255,255,255,0.15)", minWidth: "6rem" }}
        >
          <span className="pointer db pa1 hover-bg-white-10 br1" onClick={handleLeaveRoom}>
            <Txt size={TxtSize.XSMALL} value={t("leaveRoom")} />
          </span>
        </div>
      )}
    </div>
  ) : (
    <div />
  );

  const avatarContent = (
    <div className="flex items-center">
      {!playerName && <LanguageSelector outlined />}
      {playerName && (
        <div ref={menuRef} className="relative ml2">
          <span className="pointer" onClick={() => setShowMenu(!showMenu)}>
            <PlayerAvatar name={playerName} size={AvatarSize.MEDIUM} />
          </span>
          {showMenu && (
            <div
              className="absolute right-0 mt1 pa2 br2 shadow-1 z-999 landscape-sidebar-avatar-menu"
              style={{ background: "#1a1a3e", border: "1px solid rgba(255,255,255,0.15)", minWidth: "6rem" }}
            >
              {notifSupported && (
                <label className="pointer db pa1 mb1 hover-bg-white-10 br1 flex items-center justify-between">
                  <Txt className="mr2" size={TxtSize.XSMALL} value={t("notifications")} />
                  <div
                    className="relative br-pill flex-shrink-0"
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
              <span className="pointer db pa1 mb1 hover-bg-white-10 br1">
                <LanguageSelector className="f7 f6-l h-auto pa0" outlined />
              </span>
              <span className="pointer db pa1 hover-bg-white-10 br1" onClick={handleLogout}>
                <Txt size={TxtSize.XSMALL} value={t("logout")} />
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Default horizontal header */}
      <div className={`app-header-horizontal flex items-center justify-between pv2 ph3 bb b--yellow-light${isLandscapeSidebar ? " landscape-game-hide" : ""}`}>
        {leftNavContent}
        {avatarContent}
      </div>

      {/* Landscape sidebar for game page */}
      {isLandscapeSidebar && (
        <div className="app-header-sidebar landscape-game-show flex flex-column justify-between items-center pv2 ph1 br b--yellow-light">
          {leftNavContent}
          {avatarContent}
        </div>
      )}

      <style global jsx>{`
        .app-header-sidebar {
          display: none;
        }
        .landscape-sidebar-hide {
          margin-left: 0.5rem;
        }
        @media screen and (orientation: landscape) and (max-height: 500px) {
          .landscape-game-hide {
            display: none !important;
          }
          .app-header-sidebar {
            display: flex !important;
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 2.75rem;
            z-index: 100;
            background: #00153f;
            align-items: center;
          }
          .landscape-sidebar-hide {
            display: none !important;
          }
          .landscape-sidebar-hide-name {
            margin-right: 0;
            font-size: 0.7rem;
          }
          .landscape-sidebar-menu {
            left: 100% !important;
            top: 0 !important;
            margin-top: 0 !important;
            margin-left: 0.25rem;
          }
          .landscape-sidebar-avatar-menu {
            left: 100% !important;
            right: auto !important;
            bottom: 0 !important;
            top: auto !important;
            margin-top: 0 !important;
            margin-left: 0.25rem;
          }
          .app-header-sidebar ~ * {
            margin-left: 2.75rem;
          }
        }
      `}</style>
    </>
  );
}
