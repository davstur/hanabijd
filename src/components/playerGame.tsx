import classnames from "classnames";
import { TFunction } from "i18next";
import React, { HTMLAttributes, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowContainer, Popover } from "react-tiny-popover";
import { AnimatePresence, motion } from "motion/react";
import Card, { CardSize, ICardContext, PositionMap } from "~/components/card";
import ChatPopover from "~/components/chatPopover";
import PlayerName, { PlayerNameSize } from "~/components/playerName";
import PlayerStats from "~/components/playerStats";
import ReactionsPopover from "~/components/reactionsPopover";
import Button, { ButtonSize } from "~/components/ui/button";
import Txt, { TxtSize } from "~/components/ui/txt";
import Vignettes from "~/components/vignettes";
import { useCurrentPlayer, useGame, useSelfPlayer } from "~/hooks/game";
import { useReplay } from "~/hooks/replay";
import { matchColor, matchNumber, MaxHints } from "~/lib/actions";
import IGameState, {
  GameMode,
  GameVariant,
  IAction,
  ICard,
  IColor,
  IGameStatus,
  IHintAction,
  INumber,
  IPlayer,
} from "~/lib/state";
import { POPOVER_ARROW_COLOR, POPOVER_CONTENT_STYLE } from "~/components/popoverAppearance";

function isCardHintable(game: IGameState, hint: IHintAction, card: ICard) {
  return hint.type === "color"
    ? matchColor(card.color, hint.value as IColor)
    : matchNumber(game, card.number, hint.value as INumber);
}
function textualHint(game: IGameState, hint: IHintAction, cards: ICard[], t: TFunction) {
  const hintableCards = cards
    .map((c, i) => (isCardHintable(game, hint, c) ? i : null))
    .filter((i) => i !== null)
    .map((i) => PositionMap[i]);

  if (hintableCards.length === 0) {
    if (hint.type === "color") return t("negativeHintColor", { color: t(hint.value as string, { count: 5 }) });
    // count= 5, to force plural in some languages
    else return t("negativeHintNumber", { number: hint.value });
  }

  if (hint.type === "color") {
    return t("positiveHintColor", {
      count: hintableCards.length, // whether to use the plural translation
      positions: hintableCards.join(", "),
      color: t(hint.value as string, { count: hintableCards.length }),
    });
  } else {
    if (game.options.variant === GameVariant.SEQUENCE) {
      return t("positiveHintNumberSequence", {
        count: hintableCards.length,
        positions: hintableCards.join(", "),
        number: hint.value,
      });
    }

    return t("positiveHintNumber", {
      count: hintableCards.length,
      positions: hintableCards.join(", "),
      number: hint.value,
    });
  }
}

interface Props extends HTMLAttributes<HTMLElement> {
  player: IPlayer;
  selected: boolean;
  active?: boolean;
  self?: boolean;
  cardIndex?: number;
  displayStats: boolean;
  onSelectPlayer: (player: IPlayer, cardIndex: number) => void;
  onNotifyPlayer?: (player: IPlayer) => void;
  onReaction?: (reaction: string) => void;
  onCommitAction: (action: IAction) => void;
  onCloseArea: () => void;
}

export default function PlayerGame(props: Props) {
  const {
    player,
    self = false,
    selected = false,
    cardIndex,
    onSelectPlayer,
    onNotifyPlayer,
    onCommitAction,
    onCloseArea,
    onReaction,
    active,
    displayStats,
    ...attributes
  } = props;

  const game = useGame();
  const { t } = useTranslation();
  const replay = useReplay();
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [hideCards, setHideCards] = useState(true);
  const [selectedCard, selectCard] = useState<number>(cardIndex);
  const [revealCards, setRevealCards] = useState(false);
  const [pendingHint, setPendingHint] = useState<IHintAction>({
    type: null,
    value: null,
  } as IHintAction);

  const selfPlayer = useSelfPlayer(game);
  const currentPlayer = useCurrentPlayer(game);

  useEffect(() => {
    setRevealCards(false);
  }, [game.id]);

  useEffect(() => {
    let tempHideCards = true;
    // Show cards when spectating game
    if (!selfPlayer) {
      tempHideCards = false;
    }
    // Show cards to other players
    if (!self && selfPlayer) {
      tempHideCards = false;
    }
    // Show cards in replay mode (when toggled)
    if (revealCards) {
      tempHideCards = false;
    }
    // Before game has started, hide cards in pass&play mode
    if (game.options.gameMode === GameMode.PASS_AND_PLAY && game.status === IGameStatus.LOBBY) {
      tempHideCards = true;
    }
    setHideCards(tempHideCards);
  }, [game.status, revealCards, game.options.gameMode, selfPlayer, self]);

  const canPlay = [IGameStatus.ONGOING, IGameStatus.OVER].includes(game.status) && !replay.cursor;

  const hasSelectedCard = selectedCard !== null;
  const cardContext = selected
    ? ICardContext.TARGETED_PLAYER
    : self
      ? ICardContext.SELF_PLAYER
      : ICardContext.OTHER_PLAYER;

  return (
    <>
      <div
        className={classnames("cards flex justify-between bg-main-dark pa2 pv2-l ph6.5-m relative", {
          "flex-column": selected,
        })}
        onClick={() => {
          if (!selected) onSelectPlayer(player, 0);
        }}
        {...attributes}
      >
        <div className="flex items-center">
          <div className="flex flex-wrap identityBlock">
            <div className="flex flex-wrap flex-row nameBlock">
              <div className="flex flex-column">
                {player === selfPlayer && player === currentPlayer && (
                  <Txt
                    className="yellow nt1"
                    id="your-turn"
                    size={TxtSize.XSMALL}
                    value={game.status === IGameStatus.LOBBY ? t("youWillStart") : t("yourTurn")}
                  />
                )}
                <div className={classnames("flex items-center")}>
                  {player === currentPlayer && <Txt className="yellow mr2" size={TxtSize.SMALL} value="➤" />}
                  <PlayerName className="mr2" explicit={true} player={player} size={PlayerNameSize.MEDIUM} />
                </div>
              </div>

              {!self && player.reaction && (
                <Txt
                  style={{
                    animation: "FontPulse 600ms 5",
                  }}
                  value={player.reaction}
                />
              )}
            </div>
            <div className="buttonBar">
              <div>
                {self && !replay.cursor && (
                  <Popover
                    containerClassName="z-999"
                    content={({ position, childRect, popoverRect }) => {
                      return (
                        <ArrowContainer
                          arrowColor={POPOVER_ARROW_COLOR} // determined from .b--yellow
                          arrowSize={10}
                          arrowStyle={{ opacity: 1 }}
                          childRect={childRect}
                          popoverRect={popoverRect}
                          position={position}
                        >
                          <ReactionsPopover
                            style={POPOVER_CONTENT_STYLE}
                            onClose={() => setReactionsOpen(false)}
                            onReaction={onReaction}
                          />
                        </ArrowContainer>
                      );
                    }}
                    isOpen={reactionsOpen}
                    padding={5}
                    onClickOutside={() => setReactionsOpen(false)}
                  >
                    <a
                      className="pointer grow"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReactionsOpen(!reactionsOpen);
                        setChatOpen(false);
                      }}
                    >
                      {player.reaction && (
                        <Txt
                          style={{
                            animation: "FontPulse 600ms 5",
                          }}
                          value={player.reaction}
                        />
                      )}
                      {!player.reaction && <Txt style={{ filter: "grayscale(100%)" }} value="︎︎︎︎😊" />}
                    </a>
                  </Popover>
                )}

                {self && !replay.cursor && game.status !== IGameStatus.LOBBY && (
                  <Popover
                    containerClassName="z-999"
                    content={({ position, childRect, popoverRect }) => {
                      return (
                        <ArrowContainer
                          arrowColor={POPOVER_ARROW_COLOR} // determined from .b--yellow
                          arrowSize={10}
                          arrowStyle={{ opacity: 1 }}
                          childRect={childRect}
                          popoverRect={popoverRect}
                          position={position}
                        >
                          {<ChatPopover style={POPOVER_CONTENT_STYLE} onClose={() => setChatOpen(false)} />}
                        </ArrowContainer>
                      );
                    }}
                    isOpen={chatOpen}
                    padding={5}
                    onClickOutside={() => setChatOpen(false)}
                  >
                    <a
                      className="pointer grow"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatOpen(!chatOpen);
                        setReactionsOpen(false);
                      }}
                    >
                      <span>
                        &nbsp;
                        <Txt value="💬" />
                      </span>
                    </a>
                  </Popover>
                )}
              </div>

              {active && selfPlayer && !self && !player.notified && !player.bot && (
                <a
                  className="ml1 ml4-l pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNotifyPlayer(player);
                  }}
                >
                  <Txt value="🔔" />
                </a>
              )}
            </div>
          </div>
          {selected && (
            <a className="absolute top-0 right-0 mt2 mr3 pr6.5-m" onClick={() => onCloseArea()}>
              <Txt value="×" />
            </a>
          )}
        </div>

        <div className={classnames("flex justify-end self-end flex-grow-1 dib")}>
          {displayStats && (
            <div className="ml3">
              <PlayerStats className="w4.5" player={player} />
            </div>
          )}
          {!displayStats && (
            <div className="relative flex items-center justify-end flex-grow-1 dib">
              {/* When game has ended (even in replay mode)
              Enable user to view their game */}
              {(game.endedAt || game.originalGame?.endedAt) && player === selfPlayer && (
                <Button
                  void
                  className={classnames(
                    {
                      revealCardButton: selected,
                    },
                    "tracked-tight"
                  )}
                  size={ButtonSize.TINY}
                  text={revealCards ? t("hide") : t("reveal")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRevealCards(!revealCards);
                  }}
                />
              )}

              <AnimatePresence mode="popLayout">
                {player.hand.map((card, i) => (
                  <motion.div
                    key={card.id}
                    layout
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      opacity: { duration: 0.15, delay: 0.25 },
                      scale: { duration: 0.15, delay: 0.25 },
                      layout: { duration: 0.15, delay: 0.1, ease: "easeInOut" },
                    }}
                  >
                    <Card
                      card={card}
                      className={classnames({
                        "ma1": selected,
                        "mr1 mr2-l": i < player.hand.length - 1,
                      })}
                      context={cardContext}
                      hidden={hideCards}
                      position={i}
                      selected={
                        selected &&
                        (player === selfPlayer ? selectedCard === i : isCardHintable(game, pendingHint, card))
                      }
                      size={selected ? CardSize.LARGE : CardSize.MEDIUM}
                      style={{
                        ...(selected && { transition: "all 50ms ease-in-out" }),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlayer(player, i);
                        if (player === selfPlayer) {
                          selectCard(i);
                        }
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Self player actions */}
      <div
        className="ph6.5-m"
        style={{
          transform: "translateY(0)",
          transition: "transform 150ms ease-in-out",
          ...(!selected && { opacity: 0, transform: "translateY(-100px)" }),
        }}
      >
        {canPlay && selected && player === selfPlayer && selfPlayer === currentPlayer && (
          <div className="flex flex-column items-end mb2">
            <div className="flex justify-end items-center h-100-l">
              {hasSelectedCard && (
                <Txt
                  className="pb1 pb2-l ml1 mb2 mr3 ml2-l"
                  value={t("cardSelected", { position: PositionMap[selectedCard] })}
                />
              )}

              {hasSelectedCard && (
                <div className="flex flex pb2">
                  {["discard", "play"].map((action) => (
                    <Button
                      key={action}
                      className="mr2"
                      disabled={
                        (action === "discard" && game.tokens.hints === 8) ||
                        (action === "discard" && player.hand.length === 0)
                      }
                      id={action}
                      text={t(action)}
                      onClick={() => {
                        onCommitAction({
                          action: action as "discard" | "play",
                          from: selfPlayer.index,
                          cardIndex: selectedCard,
                        });
                        setPendingHint({ value: null, type: null } as IHintAction);
                        selectCard(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            {hasSelectedCard && game.tokens.hints === MaxHints && (
              <Txt className="orange mr2 flex flex-column items-end">
                <span>{t("eightTokens")}</span>
                <span>{t("cannotDiscard")}</span>
              </Txt>
            )}
          </div>
        )}
      </div>

      {/* Other player actions */}
      <div
        className="ph6.5-m"
        style={{
          opacity: 1,
          transform: "translateY(0)",
          transition: "all 150ms ease-in-out",
          ...(!selected && { opacity: 0, transform: "translateY(-100px)" }),
        }}
      >
        {canPlay && selected && player !== selfPlayer && selfPlayer === currentPlayer && (
          <div className="hint-area flex flex-column items-end pb2 mr2">
            <div className="hint-row flex items-center">
              <Vignettes pendingHint={pendingHint} onSelect={(action) => setPendingHint(action)} />

              <div className="hint-button-group flex items-center ml2">
                {pendingHint.value && game.tokens.hints !== 0 && (
                  <Txt italic className="mr3" value={textualHint(game, pendingHint, player.hand, t)} />
                )}
                {game.tokens.hints === 0 && <Txt className="mr3 orange" value={t("noTokens")} />}

                <Button
                  disabled={!pendingHint.type || game.tokens.hints === 0}
                  id="give-hint"
                  text={t("hint")}
                  onClick={() => {
                    onCommitAction({
                      action: "hint",
                      from: currentPlayer.index,
                      to: player.index,
                      ...pendingHint,
                    });
                    setPendingHint({ value: null, type: null } as IHintAction);
                    selectCard(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <style global jsx>{`
        .revealCardButton {
          position: absolute;
          top: -1.3rem;
          right: 3.5rem;
        }

        @media screen and (min-width: 60em) {
          .revealCardButton {
            position: relative;
            top: 0;
            right: 0;
          }
        }

        .hint-row {
          flex-direction: row;
        }

        @media screen and (orientation: landscape) and (max-height: 500px) {
          .vignettes-container {
            flex-direction: row !important;
            gap: 0.5rem;
          }
          .vignettes-container > div {
            margin-bottom: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
