import React, { useEffect, useState } from "react";
import MagicGame from "~/components/magic/MagicGame";
import MagicLobby from "~/components/magic/MagicLobby";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useMagicSelfPlayerIndex } from "~/hooks/magic/game";
import { newMagicGame } from "~/lib/magic/actions";
import { subscribeToMagicGame, updateMagicGame } from "~/lib/magic/firebase";
import IMagicGameState, { IMagicCardRef, IMagicPlayer, MagicGameStatus } from "~/lib/magic/state";

const NAME_KEY = "name";

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

interface Props {
  gameId: string;
}

export default function MagicGameIndex({ gameId }: Props) {
  const [game, setGame] = useState<IMagicGameState | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time game updates
  useEffect(() => {
    if (!gameId) return;

    const unsub = subscribeToMagicGame(gameId, (gameData) => {
      setGame(gameData);
      setLoading(false);
    });

    return unsub;
  }, [gameId]);

  const playerName = getPlayerName();
  const selfPlayerIndex = useMagicSelfPlayerIndex(game);

  if (loading) {
    return (
      <div className="w-100 h-100 flex items-center justify-center bg-main-dark">
        <Txt size={TxtSize.MEDIUM} value="Loading..." />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="w-100 h-100 flex items-center justify-center bg-main-dark">
        <Txt size={TxtSize.MEDIUM} value="Game not found" />
      </div>
    );
  }

  // LOBBY: deck selection
  if (game.status === MagicGameStatus.LOBBY) {
    return (
      <MagicLobby
        game={game}
        playerName={playerName}
        onJoinWithDeck={async (deck: IMagicCardRef[]) => {
          const newPlayer: IMagicPlayer = {
            name: playerName,
            life: game.options.startingLife,
            library: [],
            hand: [],
            battlefield: [],
            graveyard: [],
            exile: [],
            tokens: [],
          };

          const updatedGame: IMagicGameState = {
            ...game,
            players: [...game.players, newPlayer],
          };

          // Store deck for game start
          const decks = [...(updatedGame.originalDecks || []), deck];
          updatedGame.originalDecks = decks;

          await updateMagicGame(updatedGame);
        }}
        onStartGame={async () => {
          if (!game.originalDecks || game.originalDecks.length < game.options.playersCount) return;

          const players = game.players.map((p, i) => ({
            name: p.name,
            deck: game.originalDecks![i],
          }));

          const started = newMagicGame({
            id: game.id,
            playersCount: game.options.playersCount,
            startingLife: game.options.startingLife,
            gameMode: game.options.gameMode,
            players,
          });

          await updateMagicGame(started);
        }}
      />
    );
  }

  // ONGOING / OVER: game view
  if (selfPlayerIndex === -1) {
    // Spectator: show as player 0
    return <MagicGame game={game} selfPlayerIndex={0} />;
  }

  return <MagicGame game={game} selfPlayerIndex={selfPlayerIndex} />;
}
