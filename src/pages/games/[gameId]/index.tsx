import { useRouter } from "next/router";
import React, { useMemo, useState } from "react";
import GameIndex from "~/components/GameIndex";
import { ReplayContext } from "~/hooks/replay";
import { Session, SessionContext } from "~/hooks/session";
import { useRequireName } from "~/hooks/useRequireName";

function getLocalPlayerName(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem("name");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return stored;
    }
  }
  return "";
}

export default function Play() {
  const router = useRouter();
  const gameId = router.query.gameId as string;
  useRequireName();

  const [replayCursor, setReplayCursor] = useState<number>(null);

  const session = useMemo<Session>(() => {
    return { playerId: getLocalPlayerName() };
  }, []);

  const host = typeof window !== "undefined" ? window.location.origin : "";

  if (!gameId) return null;

  return (
    <SessionContext.Provider value={session}>
      <ReplayContext.Provider value={{ cursor: replayCursor, moveCursor: setReplayCursor }}>
        <GameIndex gameId={gameId} host={host} />
      </ReplayContext.Provider>
    </SessionContext.Provider>
  );
}
