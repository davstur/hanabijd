import React, { useEffect, useState } from "react";
import MagicGame from "~/components/magic/MagicGame";
import MagicLobby from "~/components/magic/MagicLobby";
import Txt, { TxtSize } from "~/components/ui/txt";
import { getPlayerName, useMagicSelfPlayerIndex } from "~/hooks/magic/game";
import { newMagicGame } from "~/lib/magic/actions";
import { subscribeToMagicGame, updateMagicGame } from "~/lib/magic/firebase";
import { IMagicCardRef, IMagicGameState, IMagicPlayer, MagicGameStatus } from "~/lib/magic/state";

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

  // Auto-start: when all players have joined with decks, player 0 triggers start
  useEffect(() => {
    if (!game) return;
    if (game.status !== MagicGameStatus.LOBBY) return;
    if (!game.originalDecks || game.originalDecks.length < game.options.playersCount) return;
    if (game.players.length < game.options.playersCount) return;

    // Only player at index 0 triggers the start to prevent race conditions
    const myIndex = game.players.findIndex((p) => p.name === playerName);
    if (myIndex !== 0) return;

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

    updateMagicGame(started);
  }, [game, playerName]);

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

  // LOBBY: deck selection or waiting
  if (game.status === MagicGameStatus.LOBBY) {
    const hasJoined = selfPlayerIndex !== -1;

    if (!hasJoined) {
      // Show deck picker
      return (
        <MagicLobby
          onSelectDeck={async (deck: IMagicCardRef[]) => {
            // Shuffle and deal 7 so the player sees their hand while waiting
            const shuffled = [...deck].sort(() => Math.random() - 0.5);
            const newPlayer: IMagicPlayer = {
              name: playerName,
              life: game.options.startingLife,
              library: shuffled.slice(7),
              hand: shuffled.slice(0, 7),
              battlefield: [],
              graveyard: [],
              exile: [],
              tokens: [],
            };

            const updatedGame: IMagicGameState = {
              ...game,
              players: [...game.players, newPlayer],
              originalDecks: [...(game.originalDecks || []), deck],
            };

            await updateMagicGame(updatedGame);
          }}
        />
      );
    }

    // Joined, waiting for opponent — show full game view with a banner
    return (
      <div className="relative w-100" style={{ height: "100%", overflow: "hidden" }}>
        <MagicGame game={game} selfPlayerIndex={selfPlayerIndex} />
        <div
          className="absolute flex items-center justify-center"
          style={{ top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }}
        >
          <div className="flex flex-column items-center pa4 br3" style={{ background: "rgba(0,0,20,0.9)" }}>
            <Txt className="mb3" size={TxtSize.MEDIUM} value="Waiting for opponent..." />
          </div>
        </div>
      </div>
    );
  }

  // ONGOING / OVER: game view
  if (selfPlayerIndex === -1) {
    // Spectator: show as player 0
    return <MagicGame game={game} selfPlayerIndex={0} />;
  }

  return <MagicGame game={game} selfPlayerIndex={selfPlayerIndex} />;
}
