import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Game } from "~/components/game";
import Txt, { TxtSize } from "~/components/ui/txt";
import useConnectivity from "~/hooks/connectivity";
import { GameContext } from "~/hooks/game";
import { loadUserPreferences, UserPreferencesContext } from "~/hooks/userPreferences";
import { subscribeToGame } from "~/lib/firebase";
import IGameState from "~/lib/state";

function SsrFreeGameIndex(props: { host: string; gameId: string; game?: IGameState }) {
  const { gameId, host, game: initialGame } = props;
  const [userPreferences, setUserPreferences] = useState(loadUserPreferences());
  const [game, setGame] = useState<IGameState | null>(initialGame || null);
  const online = useConnectivity();
  const router = useRouter();
  /**
   * Load game from database
   */
  useEffect(() => {
    if (!online) return;

    return subscribeToGame(gameId, (game) => {
      if (!game) {
        return router.push("/404");
      }

      setGame({ ...game, synced: true });
    });
  }, [online, gameId, router]);

  if (!game) {
    return (
      <div className="w-100 h-100 flex justify-center items-center bg-main-dark">
        <Txt size={TxtSize.MEDIUM} value="Loading..." />
      </div>
    );
  }

  return (
    <GameContext.Provider value={game}>
      <UserPreferencesContext.Provider value={[userPreferences, setUserPreferences]}>
        <Game host={host} onGameChange={setGame} />
      </UserPreferencesContext.Provider>
    </GameContext.Provider>
  );
}

const GameIndex = dynamic(() => Promise.resolve(SsrFreeGameIndex), {
  ssr: false,
});
export default GameIndex;
