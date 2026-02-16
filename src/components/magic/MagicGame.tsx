import React, { useCallback, useState } from "react";
import MagicActionMenu from "~/components/magic/MagicActionMenu";
import MagicBattlefield from "~/components/magic/MagicBattlefield";
import MagicCardZoom from "~/components/magic/MagicCardZoom";
import MagicHand from "~/components/magic/MagicHand";
import MagicLifeCounter from "~/components/magic/MagicLifeCounter";
import MagicTokenDialog from "~/components/magic/MagicTokenDialog";
import MagicToolbar from "~/components/magic/MagicToolbar";
import MagicZoneViewer from "~/components/magic/MagicZoneViewer";
import Txt, { TxtSize } from "~/components/ui/txt";
import {
  adjustCounter,
  concedeGame,
  createToken,
  drawCard,
  flipCard,
  moveCard,
  moveCardPosition,
  moveTokenPosition,
  mulligan,
  passTurn,
  removeToken,
  restartGame,
  setLife,
  shuffleLibrary,
  tapCard,
  tapToken,
  toggleFaceDown,
  untapAll,
} from "~/lib/magic/actions";
import { updateMagicGame } from "~/lib/magic/firebase";
import IMagicGameState, { IMagicCardRef, IMagicToken, MagicGameStatus, MagicZone } from "~/lib/magic/state";

interface Props {
  game: IMagicGameState;
  selfPlayerIndex: number;
}

interface ActionMenuState {
  card: IMagicCardRef;
  zone: MagicZone;
  position: { x: number; y: number };
}

export default function MagicGame({ game, selfPlayerIndex }: Props) {
  const [zoomCard, setZoomCard] = useState<IMagicCardRef | null>(null);
  const [zoomToken, setZoomToken] = useState<IMagicToken | null>(null);
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [viewingZone, setViewingZone] = useState<{ zone: MagicZone; playerIndex: number } | null>(null);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const selfPlayer = game.players[selfPlayerIndex];
  const opponentIndex = selfPlayerIndex === 0 ? 1 : 0;
  const opponent = game.players[opponentIndex] || {
    name: "Opponent",
    life: game.options.startingLife,
    library: [],
    hand: [],
    battlefield: [],
    graveyard: [],
    exile: [],
    tokens: [],
  };

  const isOver = game.status === MagicGameStatus.OVER;

  // ---- State update helper ----
  const update = useCallback((newState: IMagicGameState) => {
    updateMagicGame(newState);
  }, []);

  // ---- Card click: zoom ----
  function handleCardClick(card: IMagicCardRef) {
    if (card.faceDown) return;
    setZoomCard(card);
  }

  function handleTokenClick(token: IMagicToken) {
    setZoomToken(token);
  }

  // ---- Card context menu ----
  function handleCardContext(card: IMagicCardRef, zone: MagicZone, e: React.MouseEvent) {
    e.preventDefault();
    setActionMenu({ card, zone, position: { x: e.clientX, y: e.clientY } });
  }

  // ---- Action menu handler ----
  function handleAction(action: string, payload?: unknown) {
    if (!actionMenu) return;
    const { card, zone } = actionMenu;

    switch (action) {
      case "move": {
        if (typeof payload === "object" && payload !== null && "zone" in payload) {
          const { zone: toZone, position } = payload as { zone: MagicZone; position: "top" | "bottom" };
          update(moveCard(game, selfPlayerIndex, card.instanceId, zone, toZone, position));
        } else {
          update(moveCard(game, selfPlayerIndex, card.instanceId, zone, payload as MagicZone));
        }
        break;
      }
      case "tap":
        update(tapCard(game, selfPlayerIndex, card.instanceId));
        break;
      case "faceDown":
        update(toggleFaceDown(game, selfPlayerIndex, card.instanceId));
        break;
      case "flip":
        update(flipCard(game, selfPlayerIndex, card.instanceId));
        break;
      case "counter":
        update(adjustCounter(game, selfPlayerIndex, card.instanceId, payload as number));
        break;
      case "zoom":
        setZoomCard(card);
        break;
    }
    setActionMenu(null);
  }

  // ---- Toolbar actions ----
  function handleDraw() {
    update(drawCard(game, selfPlayerIndex));
  }
  function handleUntapAll() {
    update(untapAll(game, selfPlayerIndex));
  }
  function handleShuffle() {
    update(shuffleLibrary(game, selfPlayerIndex));
  }
  function handleMulligan() {
    update(mulligan(game, selfPlayerIndex));
  }
  function handlePassTurn() {
    update(passTurn(game));
  }
  function handleRestart() {
    if (window.confirm("Restart the game? Both players' boards will be reset.")) {
      update(restartGame(game));
    }
  }
  function handleConcede() {
    if (window.confirm("Are you sure you want to concede?")) {
      update(concedeGame(game, selfPlayerIndex));
    }
  }
  function handleLifeChange(newLife: number) {
    update(setLife(game, selfPlayerIndex, newLife));
  }
  function handleCreateToken(token: Omit<IMagicToken, "instanceId" | "tapped" | "counters">) {
    update(createToken(game, selfPlayerIndex, token));
  }
  function handleCardDrop(cardInstanceId: string, x: number, y: number) {
    update(moveCardPosition(game, selfPlayerIndex, cardInstanceId, x, y));
  }
  function handleTokenDrop(tokenInstanceId: string, x: number, y: number) {
    update(moveTokenPosition(game, selfPlayerIndex, tokenInstanceId, x, y));
  }
  function handleRemoveToken(tokenInstanceId: string) {
    update(removeToken(game, selfPlayerIndex, tokenInstanceId));
  }

  if (!selfPlayer) {
    return (
      <div className="w-100 h-100 flex items-center justify-center bg-main-dark">
        <Txt size={TxtSize.MEDIUM} value="Waiting for players..." />
      </div>
    );
  }

  return (
    <div
      className="w-100 flex flex-column bg-main-dark"
      style={{
        height: "100%",
        overflow: "hidden",
        backgroundImage: "linear-gradient(to bottom, #0a1628, #0d1f3c)",
      }}
    >
      {/* Game over banner */}
      {isOver && <div className="w-100 tc pa2 bg-red white fw6 f6">Game Over</div>}

      {/* Opponent bar: name + life */}
      <div className="ph2 pt2 pb1 flex items-center justify-between" style={{ gap: 8 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <span className="white fw6 f6">{opponent.name}</span>
          <span className="white fw6 f5 tc" style={{ minWidth: 32 }}>
            {opponent.life}
          </span>
        </div>
      </div>

      {/* Opponent zone shortcuts */}
      <div className="flex items-center ph2 mb1" style={{ gap: 6 }}>
        <span className="lavender f7">Lib: {opponent.library.length}</span>
        <span className="lavender f7">Hand: {opponent.hand.length}</span>
        <button
          className="pointer bg-white-10 white bn br2 ph2 pv1 f7 grow"
          onClick={() => setViewingZone({ zone: MagicZone.GRAVEYARD, playerIndex: opponentIndex })}
        >
          GY ({opponent.graveyard.length})
        </button>
        <button
          className="pointer bg-white-10 white bn br2 ph2 pv1 f7 grow"
          onClick={() => setViewingZone({ zone: MagicZone.EXILE, playerIndex: opponentIndex })}
        >
          Exile ({opponent.exile.length})
        </button>
      </div>

      {/* Opponent battlefield */}
      <div className="ph2 mb1" style={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
        <MagicBattlefield
          cards={opponent.battlefield}
          isActiveTurn={game.currentPlayer === opponentIndex}
          isOwn={false}
          tokens={opponent.tokens}
          onCardClick={handleCardClick}
          onCardContext={(card, e) => {
            e.preventDefault();
            setZoomCard(card);
          }}
          onTokenClick={handleTokenClick}
          onTokenContext={(token, e) => {
            e.preventDefault();
            setZoomToken(token);
          }}
        />
      </div>

      {/* Your battlefield */}
      <div className="ph2 mb1" data-zone="self-battlefield" style={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
        <MagicBattlefield
          cards={selfPlayer.battlefield}
          isActiveTurn={game.currentPlayer === selfPlayerIndex}
          isOwn
          tokens={selfPlayer.tokens}
          onCardClick={(card) => update(tapCard(game, selfPlayerIndex, card.instanceId))}
          onCardContext={(card, e) => handleCardContext(card, MagicZone.BATTLEFIELD, e)}
          onCardDoubleClick={handleCardClick}
          onCardDrop={handleCardDrop}
          onTokenClick={(token) => {
            update(tapToken(game, selfPlayerIndex, token.instanceId));
          }}
          onTokenContext={(token, e) => {
            e.preventDefault();
            if (window.confirm(`Remove ${token.name} token?`)) {
              handleRemoveToken(token.instanceId);
            }
          }}
          onTokenDrop={handleTokenDrop}
        />
      </div>

      {/* Your zone shortcuts */}
      <div className="flex items-center ph2 mb1" style={{ gap: 6 }}>
        <span className="lavender f7">Lib: {selfPlayer.library.length}</span>
        <button
          className="pointer bg-white-10 white bn br2 ph2 pv1 f7 grow"
          onClick={() => setViewingZone({ zone: MagicZone.GRAVEYARD, playerIndex: selfPlayerIndex })}
        >
          GY ({selfPlayer.graveyard.length})
        </button>
        <button
          className="pointer bg-white-10 white bn br2 ph2 pv1 f7 grow"
          onClick={() => setViewingZone({ zone: MagicZone.EXILE, playerIndex: selfPlayerIndex })}
        >
          Exile ({selfPlayer.exile.length})
        </button>
        <button className="pointer bg-white-10 white bn br2 ph2 pv1 f7 grow" onClick={() => setShowLog(!showLog)}>
          Log
        </button>
        <button className="pointer bg-white-10 white bn br2 ph2 pv1 f7 grow" onClick={() => setShowRules(true)}>
          Rules
        </button>
      </div>

      {/* Your hand */}
      <div className="ph2 mb1">
        <MagicHand
          cards={selfPlayer.hand}
          onCardClick={handleCardClick}
          onCardContext={(card, e) => handleCardContext(card, MagicZone.HAND, e)}
          onPlayCard={(card) => {
            update(moveCard(game, selfPlayerIndex, card.instanceId, MagicZone.HAND, MagicZone.BATTLEFIELD));
          }}
        />
      </div>

      {/* Bottom bar: name + life + toolbar */}
      <div className="ph2 pb2 flex items-center justify-between" style={{ gap: 8 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <span className="white fw6 f6">{selfPlayer.name}</span>
          <MagicLifeCounter life={selfPlayer.life} onChange={handleLifeChange} />
        </div>
        {!isOver && (
          <MagicToolbar
            isMyTurn={game.currentPlayer === selfPlayerIndex}
            onConcede={handleConcede}
            onCreateToken={() => setShowTokenDialog(true)}
            onDraw={handleDraw}
            onMulligan={handleMulligan}
            onPassTurn={handlePassTurn}
            onRestart={handleRestart}
            onShuffle={handleShuffle}
            onUntapAll={handleUntapAll}
          />
        )}
      </div>

      {/* --- Modals / Overlays --- */}

      {/* Card zoom */}
      <MagicCardZoom
        card={zoomCard}
        token={zoomToken}
        onClose={() => {
          setZoomCard(null);
          setZoomToken(null);
        }}
      />

      {/* Action menu */}
      {actionMenu && (
        <MagicActionMenu
          card={actionMenu.card}
          currentZone={actionMenu.zone}
          position={actionMenu.position}
          onAction={handleAction}
          onClose={() => setActionMenu(null)}
        />
      )}

      {/* Zone viewer */}
      {viewingZone && (
        <MagicZoneViewer
          cards={game.players[viewingZone.playerIndex][viewingZone.zone]}
          zone={viewingZone.zone}
          onCardClick={handleCardClick}
          onCardContext={(card, e) => {
            if (viewingZone.playerIndex === selfPlayerIndex) {
              handleCardContext(card, viewingZone.zone, e);
            } else {
              e.preventDefault();
              setZoomCard(card);
            }
          }}
          onClose={() => setViewingZone(null)}
        />
      )}

      {/* Token creation dialog */}
      {showTokenDialog && (
        <MagicTokenDialog onClose={() => setShowTokenDialog(false)} onCreateToken={handleCreateToken} />
      )}

      {/* Rules reference */}
      {showRules && (
        <div
          className="fixed top-0 left-0 w-100 h-100 flex items-center justify-center z-999"
          style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => setShowRules(false)}
        >
          <div
            className="bg-main-dark br3 pa3 overflow-y-auto"
            style={{ maxWidth: "90vw", maxHeight: "80vh", width: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb3">
              <Txt size={TxtSize.MEDIUM} value="Quick Rules" />
              <button className="pointer bg-transparent white bn f4" onClick={() => setShowRules(false)}>
                ×
              </button>
            </div>

            <div className="white f7 lh-copy">
              <div className="fw6 yellow mb1">Goal</div>
              <p className="mt0 mb3">Reduce your opponent from 20 life to 0.</p>

              <div className="fw6 yellow mb1">Turn Phases</div>
              <ol className="mt0 mb3 pl3">
                <li className="mb1"><b>Beginning</b> — Untap all your cards, then draw a card.</li>
                <li className="mb1"><b>Main Phase 1</b> — Play lands, cast creatures, sorceries, enchantments.</li>
                <li className="mb1"><b>Combat</b> — Declare attackers (tap them). Opponent declares blockers. Deal damage.</li>
                <li className="mb1"><b>Main Phase 2</b> — Same as Main 1.</li>
                <li className="mb1"><b>End</b> — Discard down to 7 cards if needed. Pass the turn.</li>
              </ol>

              <div className="fw6 yellow mb1">Lands &amp; Mana</div>
              <p className="mt0 mb3">
                Play <b>one land per turn</b> (only during your main phases). Tap lands to produce mana.
                Mana is spent to cast spells — the cost is shown in the top-right corner of each card.
              </p>

              <div className="fw6 yellow mb1">Creatures</div>
              <p className="mt0 mb3">
                Have <b>power/toughness</b> (e.g. 3/2 = deals 3 damage, dies to 2 damage).
                Creatures have <b>summoning sickness</b> — they can{"'"}t attack or use tap abilities the turn they enter.
              </p>

              <div className="fw6 yellow mb1">Combat</div>
              <p className="mt0 mb3">
                Tap creatures to attack — they deal damage equal to their power.
                Unblocked attackers deal damage to the opponent.
                Blocked creatures deal damage to each other.
              </p>

              <div className="fw6 yellow mb1">Card Types</div>
              <ul className="mt0 mb3 pl3">
                <li className="mb1"><b>Instant</b> — Can be cast any time, even on opponent{"'"}s turn.</li>
                <li className="mb1"><b>Sorcery</b> — Cast only during your main phases. Goes to graveyard after.</li>
                <li className="mb1"><b>Enchantment</b> — Stays on the battlefield with ongoing effects.</li>
                <li className="mb1"><b>Artifact</b> — Colorless permanents with various abilities.</li>
              </ul>

              <div className="fw6 yellow mb1">Starting the Game</div>
              <p className="mt0 mb2">
                Each player starts with <b>20 life</b> and draws <b>7 cards</b>.
                If you don{"'"}t like your hand, you can mulligan (shuffle back and draw 7 again, but put 1 card
                on the bottom for each mulligan).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action log */}
      {showLog && (
        <div
          className="fixed top-0 left-0 w-100 h-100 flex items-center justify-center z-999"
          style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => setShowLog(false)}
        >
          <div
            className="bg-main-dark br3 pa3 overflow-y-auto"
            style={{ maxWidth: "90vw", maxHeight: "70vh", width: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb3">
              <Txt size={TxtSize.MEDIUM} value="Game Log" />
              <button className="pointer bg-transparent white bn f4" onClick={() => setShowLog(false)}>
                ×
              </button>
            </div>
            {game.log.length === 0 && <span className="lavender f7">No actions yet</span>}
            {[...game.log].reverse().map((entry, i) => (
              <div key={i} className="lavender f7 mb1 pb1 bb b--white-10">
                <span className="white-60">
                  {entry.playerIndex >= 0 ? game.players[entry.playerIndex]?.name : "System"}:
                </span>{" "}
                {entry.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
