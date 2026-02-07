import React, { useMemo, useState } from "react";
import GameIndex from "~/components/GameIndex";
import { TutorialProvider } from "~/components/tutorial";
import { ReplayContext } from "~/hooks/replay";
import { Session, SessionContext } from "~/hooks/session";
import { loadGame } from "~/lib/firebase";
import withSession, { getPlayerIdFromSession } from "~/lib/session";
import IGameState from "~/lib/state";

export const getServerSideProps = withSession(async function ({ req, params }) {
  const game = await loadGame(params.gameId);
  const playerId = await getPlayerIdFromSession(req);

  const protocol = process.env.NODE_ENV === "development" ? "http:" : "https:";
  const { host } = req.headers;

  return {
    props: {
      session: {
        playerId,
      },
      game,
      host: `${protocol}//${host}`,
    },
  };
});

interface Props {
  game: IGameState;
  session: Session;
  host: string;
}

function getLocalPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("playerId");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return stored;
  }
}

export default function Play(props: Props) {
  const { game: initialGame, session, host } = props;

  const [replayCursor, setReplayCursor] = useState<number>(null);

  // Prefer localStorage playerId so game pages use the same ID as room pages.
  // Falls back to the iron-session ID for users arriving via a direct game link.
  const effectiveSession = useMemo<Session>(() => {
    const localId = getLocalPlayerId();
    if (localId) return { playerId: localId };
    if (typeof window !== "undefined" && session.playerId) {
      localStorage.setItem("playerId", JSON.stringify(session.playerId));
    }
    return session;
  }, [session]);

  return (
    // eslint-disable-next-line react/jsx-no-undef
    <TutorialProvider>
      <SessionContext.Provider value={effectiveSession}>
        <ReplayContext.Provider value={{ cursor: replayCursor, moveCursor: setReplayCursor }}>
          <GameIndex game={initialGame} host={host}></GameIndex>
        </ReplayContext.Provider>
      </SessionContext.Provider>
    </TutorialProvider>
  );
}
