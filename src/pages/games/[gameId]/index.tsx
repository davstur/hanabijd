import { useRouter } from "next/router";
import React, { useMemo, useState } from "react";
import GameIndex from "~/components/GameIndex";
import { TutorialProvider } from "~/components/tutorial";
import { ReplayContext } from "~/hooks/replay";
import { Session, SessionContext } from "~/hooks/session";

function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem("name");
  if (!stored) return "";
  try {
    return JSON.parse(stored);
  } catch {
    return stored;
  }
}

export default function Play() {
  const router = useRouter();
  const gameId = router.query.gameId as string;

  const [replayCursor, setReplayCursor] = useState<number>(null);

  const session = useMemo<Session>(() => {
    return { playerName: getPlayerName() };
  }, []);

  const host = typeof window !== "undefined" ? window.location.origin : "";

  if (!gameId) return null;

  return (
    <TutorialProvider>
      <SessionContext.Provider value={session}>
        <ReplayContext.Provider value={{ cursor: replayCursor, moveCursor: setReplayCursor }}>
          <GameIndex gameId={gameId} host={host} />
        </ReplayContext.Provider>
      </SessionContext.Provider>
    </TutorialProvider>
  );
}
