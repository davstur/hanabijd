import React from "react";
import classnames from "classnames";

import { IPlayer } from "~/game/state";

import PlayerName from "~/components/playerName";
import Card, { ICardContext, ICardSize } from "~/components/card";
import Box from "~/components/ui/box";

interface Props {
  player: IPlayer;
  active?: boolean;
  self?: boolean;
  onSelectPlayer: Function;
  onNotifyPlayer?: Function;
}

export default function PlayerGame(props: Props) {
  const {
    player,
    active,
    self = false,
    onSelectPlayer,
    onNotifyPlayer
  } = props;

  return (
    <Box
      className={classnames({
        "border-box ba bw2 b--yellow": active
      })}
    >
      <div className="f6 f4-l fw1 tracked ttu ml1 flex items-center">
        <PlayerName player={player} explicit={true} className="w-100" />
        {active && !self && !player.notified && (
          <span className="ml2 pointer" onClick={() => onNotifyPlayer(player)}>
            🔔
          </span>
        )}
      </div>

      <div className="cards dib mt1 mw-100">
        <div className="flex flex-row grow pointer ph2">
          {player.hand.map((card, i) => (
            <Card
              key={i}
              onClick={() => onSelectPlayer(player, i)}
              card={card}
              position={i}
              hidden={self}
              size={ICardSize.MEDIUM}
              context={
                self ? ICardContext.SELF_PLAYER : ICardContext.OTHER_PLAYER
              }
              className={classnames({
                "mr1 mr2-l": i < player.hand.length - 1
              })}
            />
          ))}
        </div>
      </div>
      <style jsx>{`
        .cards:hover {
          background-color: var(--color-yellow);
          box-shadow: 0px 0px 5px 5px var(--color-yellow);
        }
      `}</style>
    </Box>
  );
}