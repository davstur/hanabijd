import React from "react";
import { useTranslation } from "react-i18next";
import { CardWrapper } from "~/components/card";
import DiscardArea from "~/components/discardArea";
import HomeButton from "~/components/homeButton";
import PlayedCards from "~/components/playedCards";
import TokenSpace from "~/components/tokenSpace";
import Turn from "~/components/turn";
import Button, { ButtonSize } from "~/components/ui/button";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame, useSelfPlayer } from "~/hooks/game";
import { getMaximumPossibleScore, getMaximumScore, getScore } from "~/lib/actions";
import { IGameStatus } from "~/lib/state";

interface Props {
  onHistoryClick?: () => void;
  onMenuClick?: () => void;
  onRollbackClick?: () => void;
}

export { CardWrapper } from "~/components/card";

export default function GameBoard(props: Props) {
  const { onHistoryClick, onMenuClick, onRollbackClick } = props;
  const { t } = useTranslation();

  const game = useGame();
  const selfPlayer = useSelfPlayer(game);
  const score = getScore(game);
  const maxScore = getMaximumScore(game);
  const maxPossibleScore = getMaximumPossibleScore(game);

  const recentTurns = (
    <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
      {game.turnsHistory.slice(-2).map((turn, i, arr) => {
        const turnNumber = game.turnsHistory.length - arr.length + i + 1;
        return (
          <div key={turnNumber} className="recent-turn-line">
            <Turn avatarOnly showDrawn={false} showPosition={false} turn={turn} turnNumber={turnNumber} />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="gameboard-rows">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Txt uppercase id="score" value={t("score", { score, maxPossibleScore })} />

          {maxScore !== maxPossibleScore && <Txt uppercase className="strike ml1 gray" value={maxScore} />}

          {game.actionsLeft > 0 && game.actionsLeft <= game.options.playersCount && (
            <Txt uppercase className="red ml2" value={t("turnsLeftDisclaimer", { count: game.actionsLeft })} />
          )}

          {onHistoryClick && (
            <Button void className="ml2" size={ButtonSize.TINY} text={t("playHistory")} onClick={onHistoryClick} />
          )}
        </div>
        <div className="flex">
          {game.options.allowRollback && selfPlayer && onRollbackClick && (
            <Button
              void
              disabled={game.status === IGameStatus.LOBBY}
              size={ButtonSize.TINY}
              text="⟲"
              onClick={() => onRollbackClick()}
            />
          )}
          {onMenuClick && <HomeButton void className="ml1" onClick={onMenuClick} />}
        </div>
      </div>

      <div className="flex flex-wrap flex-nowrap-landscape items-end justify-between">
        <div className="flex flex-column mb3">
          <PlayedCards cards={game.playedCards} />
        </div>
        {/* Recent turns: only visible in landscape row 2 */}
        <div className="flex items-start ml2 dn-portrait self-start">{recentTurns}</div>
        {/* Discard area: only visible in landscape row 2 */}
        <div className="flex items-end ml2 dn-portrait">
          <DiscardArea />
        </div>
        <div className="flex flex-row mt2 justify-right items-end ml2">
          <div className="mr2 relative flex flex-column items-center">
            <CardWrapper color={game.drawPile.length > 5 ? "main" : "strikes"}>
              {game.drawPile.map((card, i) => (
                <div key={i} className="absolute" style={{ top: `-${i / 2}px` }}>
                  <CardWrapper key={card.id} color={game.drawPile.length > 5 ? "main" : "strikes"}>
                    <Txt className="outline-main-dark" size={TxtSize.MEDIUM} value={i + 1} />
                  </CardWrapper>
                </div>
              ))}
            </CardWrapper>
            {game.drawPile.length <= 5 ? (
              <Txt className="red mt1" value={t("cardLeft", { pileLength: game.drawPile.length })} />
            ) : (
              <Txt className="gray mt1" value={t("deck")} />
            )}
          </div>
          <div className="tc">
            <TokenSpace hints={game.tokens.hints} strikes={game.tokens.strikes} />
            <Txt className="gray mt1" value={t("tokens")} />
          </div>
        </div>
      </div>

      {/* Row 3 (portrait only): last 2 moves + discard */}
      <div className="flex items-start justify-between mt1 db-portrait dn-landscape">
        {recentTurns}
        <div className="flex items-end ml2 flex-shrink-0">
          <DiscardArea />
        </div>
      </div>
    </div>
  );
}
