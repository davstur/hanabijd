import React, { useCallback, useRef, useState } from "react";
import { IMagicCardRef } from "~/lib/magic/state";
import { MagicCardThumbnail } from "~/components/magic/MagicCardThumbnail";

interface Props {
  cards: IMagicCardRef[];
  onCardClick: (card: IMagicCardRef) => void;
  onCardContext: (card: IMagicCardRef, e: React.MouseEvent) => void;
  onPlayCard?: (card: IMagicCardRef) => void;
}

/** Check if a screen point is over the self battlefield. */
function isOverSelfBattlefield(x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y);
  return !!el?.closest('[data-zone="self-battlefield"]');
}

function DraggableHandCard({
  card,
  onCardClick,
  onCardContext,
  onPlayCard,
}: {
  card: IMagicCardRef;
  onCardClick: (card: IMagicCardRef) => void;
  onCardContext: (card: IMagicCardRef, e: React.MouseEvent) => void;
  onPlayCard?: (card: IMagicCardRef) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const lastTapTime = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    pointerId: number;
    dragging: boolean;
    cancelled: boolean;
  } | null>(null);

  const resetDrag = useCallback(() => {
    if (ghostRef.current) {
      ghostRef.current.style.display = "none";
      ghostRef.current.style.transform = "";
      ghostRef.current.style.opacity = "";
    }
    setDragging(false);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (!onPlayCard) return;
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        dragging: false,
        cancelled: false,
      };
    },
    [onPlayCard]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds || ds.cancelled) return;

    const dy = e.clientY - ds.startY;
    const dx = e.clientX - ds.startX;

    if (!ds.dragging) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;

      // Mostly horizontal → let the browser scroll
      if (Math.abs(dx) > Math.abs(dy)) {
        ds.cancelled = true;
        return;
      }

      // Vertical drag — capture pointer and show ghost
      ds.dragging = true;
      setDragging(true);
      try {
        (e.target as HTMLElement).setPointerCapture?.(ds.pointerId);
      } catch {
        // pointer capture can fail
      }
      if (wrapperRef.current && ghostRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        ds.startX = e.clientX;
        ds.startY = e.clientY;
        ghostRef.current.style.left = `${rect.left}px`;
        ghostRef.current.style.top = `${rect.top}px`;
        ghostRef.current.style.display = "block";
      }
      return;
    }

    if (ghostRef.current) {
      const cdx = e.clientX - ds.startX;
      const cdy = e.clientY - ds.startY;
      ghostRef.current.style.transform = `translate(${cdx}px, ${cdy}px)`;
      ghostRef.current.style.opacity = isOverSelfBattlefield(e.clientX, e.clientY) ? "0.7" : "1";
    }
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      dragState.current = null;
      resetDrag();

      if (!ds) return;
      if (!ds.dragging) {
        if (!ds.cancelled) {
          const now = Date.now();
          if (now - lastTapTime.current < 300) {
            // Double tap — cancel pending single tap, fire zoom
            if (singleTapTimer.current) {
              clearTimeout(singleTapTimer.current);
              singleTapTimer.current = null;
            }
            onCardClick(card);
            lastTapTime.current = 0;
          } else {
            lastTapTime.current = now;
            // Delay single tap (no action for hand cards, just wait for potential double)
            singleTapTimer.current = setTimeout(() => {
              singleTapTimer.current = null;
            }, 300);
          }
        }
        return;
      }

      if (isOverSelfBattlefield(e.clientX, e.clientY) && onPlayCard) {
        onPlayCard(card);
      }
    },
    [card, onCardClick, onPlayCard, resetDrag]
  );

  const handlePointerCancel = useCallback(() => {
    dragState.current = null;
    resetDrag();
  }, [resetDrag]);

  return (
    <>
      {/* In-flow slot — stays in the hand, hidden while dragging */}
      <div
        ref={wrapperRef}
        style={{ touchAction: "pan-x", cursor: onPlayCard ? "grab" : "default" }}
        onContextMenu={(e) => onCardContext(card, e)}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div style={dragging ? { visibility: "hidden" } : undefined}>
          <MagicCardThumbnail card={card} small />
        </div>
      </div>
      {/* Fixed-position ghost that follows the finger */}
      <div
        ref={ghostRef}
        style={{
          display: "none",
          position: "fixed",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <MagicCardThumbnail card={card} small />
      </div>
    </>
  );
}

export default function MagicHand({ cards, onCardClick, onCardContext, onPlayCard }: Props) {
  return (
    <div
      className="w-100 pa2 br2"
      style={{
        background: "rgba(255,255,255,0.05)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div className="flex items-center" style={{ gap: 4, minHeight: 70 }}>
        {cards.length === 0 && <span className="lavender f7 o-50">No cards in hand</span>}
        {cards.map((card) => (
          <DraggableHandCard
            key={card.instanceId}
            card={card}
            onCardClick={onCardClick}
            onCardContext={onCardContext}
            onPlayCard={onPlayCard}
          />
        ))}
      </div>
    </div>
  );
}
