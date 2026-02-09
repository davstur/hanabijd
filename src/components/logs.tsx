import { AnimatePresence, motion } from "motion/react";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import Turn from "~/components/turn";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame, useSelfPlayer } from "~/hooks/game";
import { useReplay } from "~/hooks/replay";
import { IMessage } from "~/lib/state";

interface Props {
  interturn: boolean;
  showAll?: boolean;
}

export default function Logs(props: Props) {
  const { interturn, showAll } = props;
  const { t } = useTranslation();

  const game = useGame();
  const replay = useReplay();
  const selfPlayer = useSelfPlayer(game);

  const animate = !replay.cursor;
  const recentTurns = showAll ? game.turnsHistory : game.turnsHistory.slice(-3);
  const turnOffset = game.turnsHistory.length - recentTurns.length;

  return (
    <div className="flex-grow-1 overflow-y-scroll">
      <div className="relative">
        <Txt
          className="lavender"
          size={TxtSize.SMALL}
          value={game.turnsHistory.length ? t("gameStarted") : t("gameStarts")}
        />
        <AnimatePresence>
          {recentTurns.map((turn, i) => {
            const turnNumber = turnOffset + i + 1;
            const messages = game.messages.filter((message) => message.turn === turnNumber).reverse();

            return (
              <motion.div
                key={turnNumber}
                animate={{ y: 0 }}
                exit={animate ? { y: -100 } : undefined}
                initial={animate ? { y: -100 } : false}
                transition={{ duration: 0.2 }}
              >
                <Turn
                  avatarOnly
                  key={turnNumber}
                  showDrawn={!interturn && game.players[turn.action.from].name !== selfPlayer?.name}
                  turn={turn}
                  turnNumber={turnNumber}
                />
                {messages.map((message) => {
                  return <Message key={message.id} message={message} />;
                })}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface MessageProps {
  message: IMessage;
}

function Message(props: MessageProps) {
  const { message } = props;

  const game = useGame();

  const player = game.players[message.from];

  return (
    <div key={message.id} className="lavender">
      <Trans i18nKey="message">
        <Txt size={TxtSize.SMALL} value={player.name} />
        <Txt className="white" size={TxtSize.SMALL} value={message.content} />
      </Trans>
    </div>
  );
}
