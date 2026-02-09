import React from "react";
import { ActionAreaType, ISelectedArea } from "~/components/actionArea";
import PlayerGame from "~/components/playerGame";
import { useCurrentPlayer, useGame, useSelfPlayer } from "~/hooks/game";
import { IAction, IPlayer } from "~/lib/state";

interface Props {
  displayStats: boolean;
  selectedArea: ISelectedArea;
  onSelectPlayer: (player: IPlayer, cardIndex: number) => void;
  onNotifyPlayer: (player: IPlayer) => void;
  onReaction: (reaction: string) => void;
  onCloseArea: () => void;
  onCommitAction: (action: IAction) => void;
}

export default function PlayersBoard(props: Props) {
  const { displayStats, selectedArea, onSelectPlayer, onNotifyPlayer, onReaction, onCloseArea, onCommitAction } = props;

  const game = useGame();
  const selfPlayer = useSelfPlayer(game);
  const currentPlayer = useCurrentPlayer(game);

  const position = selfPlayer ? selfPlayer.index : game.players.length;
  const otherPlayers = [...game.players.slice(position + 1), ...game.players.slice(0, position)];

  let selectedPlayer = null;
  let cardIndex = null;
  if (selectedArea.type === ActionAreaType.SELF_PLAYER) {
    selectedPlayer = game.players.find((player) => player.name === selectedArea.player.name);
    cardIndex = selectedArea.cardIndex;
  }
  if (selectedArea.type === ActionAreaType.OTHER_PLAYER) {
    selectedPlayer = game.players.find((player) => player.name === selectedArea.player.name);
  }

  return (
    <>
      {otherPlayers.map((otherPlayer, i) => (
        <div key={i} className="bb b--yellow bg-main-dark pv-portrait-divider">
          <PlayerGame
            active={currentPlayer === otherPlayer}
            displayStats={displayStats}
            id={`player-game-${i + 1}`}
            player={otherPlayer}
            selected={selectedPlayer && selectedPlayer === otherPlayer}
            onCloseArea={onCloseArea}
            onCommitAction={onCommitAction}
            onNotifyPlayer={onNotifyPlayer}
            onSelectPlayer={onSelectPlayer}
          />
        </div>
      ))}
      {selfPlayer && (
        <div className="mb4 pt-portrait-divider">
          <PlayerGame
            active={currentPlayer === selfPlayer}
            cardIndex={cardIndex}
            displayStats={displayStats}
            id="player-game-self"
            player={selfPlayer}
            selected={selectedPlayer && selectedPlayer === selfPlayer}
            self={true}
            onCloseArea={onCloseArea}
            onCommitAction={onCommitAction}
            onReaction={onReaction}
            onSelectPlayer={onSelectPlayer}
          />
        </div>
      )}
    </>
  );
}
