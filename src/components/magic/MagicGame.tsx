import React, { useCallback, useState } from "react";
import MagicActionMenu from "~/components/magic/MagicActionMenu";
import MagicBattlefield from "~/components/magic/MagicBattlefield";
import MagicCardZoom from "~/components/magic/MagicCardZoom";
import MagicHand from "~/components/magic/MagicHand";
import MagicLifeCounter from "~/components/magic/MagicLifeCounter";
import MagicPlayerBar from "~/components/magic/MagicPlayerBar";
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

  const selfPlayer = game.players[selfPlayerIndex];
  const opponentIndex = selfPlayerIndex === 0 ? 1 : 0;
  const opponent = game.players[opponentIndex];

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

  if (!selfPlayer || !opponent) {
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
        height: "100vh",
        overflow: "hidden",
        backgroundImage: "linear-gradient(to bottom, #0a1628, #0d1f3c)",
      }}
    >
      {/* Game over banner */}
      {isOver && <div className="w-100 tc pa2 bg-red white fw6 f6">Game Over</div>}

      {/* Opponent bar */}
      <MagicPlayerBar isCurrent={game.currentPlayer === opponentIndex} player={opponent} />

      {/* Opponent zone shortcuts */}
      <div className="flex items-center ph2 mb1" style={{ gap: 6 }}>
        <button
          className="pointer bg-white-10 white bn br2 ph2 pv1 f7 grow"
          onClick={() => setViewingZone({ zone: MagicZone.GRAVEYARD, playerIndex: opponentIndex })}
        >
          Opp GY ({opponent.graveyard.length})
        </button>
        <button
          className="pointer bg-white-10 white bn br2 ph2 pv1 f7 grow"
          onClick={() => setViewingZone({ zone: MagicZone.EXILE, playerIndex: opponentIndex })}
        >
          Opp Exile ({opponent.exile.length})
        </button>
      </div>

      {/* Opponent battlefield */}
      <div className="ph2 mb1" style={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
        <MagicBattlefield
          cards={opponent.battlefield}
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
      <div className="ph2 mb1" style={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
        <MagicBattlefield
          cards={selfPlayer.battlefield}
          isOwn
          tokens={selfPlayer.tokens}
          onCardClick={handleCardClick}
          onCardContext={(card, e) => handleCardContext(card, MagicZone.BATTLEFIELD, e)}
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
      </div>

      {/* Your hand */}
      <div className="ph2 mb1">
        <MagicHand
          cards={selfPlayer.hand}
          onCardClick={handleCardClick}
          onCardContext={(card, e) => handleCardContext(card, MagicZone.HAND, e)}
        />
      </div>

      {/* Bottom bar: life + toolbar */}
      <div className="ph2 pb2 flex items-center justify-between" style={{ gap: 8 }}>
        <MagicLifeCounter life={selfPlayer.life} onChange={handleLifeChange} />
        {!isOver && (
          <MagicToolbar
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
