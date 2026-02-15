import React, { useCallback, useRef } from "react";
import { IMagicCardRef, IMagicToken } from "~/lib/magic/state";
import { MagicCardThumbnail, MagicTokenThumbnail } from "~/components/magic/MagicCardThumbnail";

interface Props {
  cards: IMagicCardRef[];
  tokens: IMagicToken[];
  isOwn: boolean;
  onCardClick: (card: IMagicCardRef) => void;
  onCardContext: (card: IMagicCardRef, e: React.MouseEvent) => void;
  onTokenClick: (token: IMagicToken) => void;
  onTokenContext: (token: IMagicToken, e: React.MouseEvent) => void;
  onCardDrop?: (cardInstanceId: string, x: number, y: number) => void;
  onTokenDrop?: (tokenInstanceId: string, x: number, y: number) => void;
}

/**
 * Auto-layout: cards without stored positions get placed in a grid
 * so they don't all stack at (0,0).
 */
function autoPosition(index: number): { x: number; y: number } {
  const cols = 8;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: col * 12, // ~12% per column
    y: row * 40, // ~40% per row
  };
}

/** Clamp a percentage value between 0 and a max that keeps the card visible. */
function clampX(pct: number): number {
  // Allow card to go up to ~90% so it stays visible
  return Math.max(0, Math.min(pct, 90));
}
function clampY(pct: number): number {
  return Math.max(0, Math.min(pct, 80));
}

/**
 * Draggable wrapper — handles pointer-based drag for both mouse and touch.
 * Converts drag deltas to percentage offsets relative to the container.
 */
function DraggableItem({
  children,
  containerRef,
  instanceId,
  x,
  y,
  onDrop,
  onClick,
  onContextMenu,
}: {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  instanceId: string;
  x: number;
  y: number;
  onDrop?: (id: string, x: number, y: number) => void;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const dragState = useRef<{
    startPointerX: number;
    startPointerY: number;
    startPctX: number;
    startPctY: number;
    moved: boolean;
  } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only primary button
      if (e.button !== 0) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragState.current = {
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startPctX: x,
        startPctY: y,
        moved: false,
      };
    },
    [x, y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      const container = containerRef.current;
      if (!ds || !container) return;

      const dx = e.clientX - ds.startPointerX;
      const dy = e.clientY - ds.startPointerY;

      // Threshold to distinguish click from drag
      if (!ds.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      ds.moved = true;

      const rect = container.getBoundingClientRect();
      const pctX = clampX(ds.startPctX + (dx / rect.width) * 100);
      const pctY = clampY(ds.startPctY + (dy / rect.height) * 100);

      if (elRef.current) {
        elRef.current.style.left = `${pctX}%`;
        elRef.current.style.top = `${pctY}%`;
      }
    },
    [containerRef]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      const container = containerRef.current;
      dragState.current = null;

      if (!ds) return;

      if (!ds.moved) {
        // It was a click, not a drag
        onClick?.();
        return;
      }

      if (!container || !onDrop) return;

      const dx = e.clientX - ds.startPointerX;
      const dy = e.clientY - ds.startPointerY;
      const rect = container.getBoundingClientRect();
      const pctX = clampX(ds.startPctX + (dx / rect.width) * 100);
      const pctY = clampY(ds.startPctY + (dy / rect.height) * 100);

      onDrop(instanceId, Math.round(pctX * 10) / 10, Math.round(pctY * 10) / 10);
    },
    [containerRef, instanceId, onClick, onDrop]
  );

  return (
    <div
      ref={elRef}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        cursor: onDrop ? "grab" : "default",
        touchAction: "none",
        zIndex: dragState.current?.moved ? 10 : 1,
      }}
      onContextMenu={onContextMenu}
      onPointerDown={onDrop ? handlePointerDown : undefined}
      onPointerMove={onDrop ? handlePointerMove : undefined}
      onPointerUp={onDrop ? handlePointerUp : undefined}
    >
      {children}
    </div>
  );
}

export default function MagicBattlefield({
  cards,
  tokens,
  isOwn,
  onCardClick,
  onCardContext,
  onTokenClick,
  onTokenContext,
  onCardDrop,
  onTokenDrop,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCards = cards.length > 0 || tokens.length > 0;

  return (
    <div
      ref={containerRef}
      className="w-100 br2"
      style={{
        position: "relative",
        minHeight: 160,
        height: "100%",
        background: isOwn ? "rgba(30,80,30,0.15)" : "rgba(80,30,30,0.15)",
        border: `1px solid ${isOwn ? "rgba(100,180,100,0.2)" : "rgba(180,100,100,0.2)"}`,
        overflow: "hidden",
      }}
    >
      {!hasCards && (
        <div className="flex items-center justify-center h-100" style={{ minHeight: 140 }}>
          <span className="lavender f7 o-50">{isOwn ? "Your battlefield" : "Opponent battlefield"}</span>
        </div>
      )}

      {cards.map((card, i) => {
        const pos = card.x != null && card.y != null ? { x: card.x, y: card.y } : autoPosition(i);
        return (
          <DraggableItem
            key={card.instanceId}
            containerRef={containerRef}
            instanceId={card.instanceId}
            x={pos.x}
            y={pos.y}
            onClick={() => onCardClick(card)}
            onContextMenu={(e) => onCardContext(card, e)}
            onDrop={isOwn ? onCardDrop : undefined}
          >
            <MagicCardThumbnail card={card} />
          </DraggableItem>
        );
      })}

      {tokens.map((token, i) => {
        const pos = token.x != null && token.y != null ? { x: token.x, y: token.y } : autoPosition(cards.length + i);
        return (
          <DraggableItem
            key={token.instanceId}
            containerRef={containerRef}
            instanceId={token.instanceId}
            x={pos.x}
            y={pos.y}
            onClick={() => onTokenClick(token)}
            onContextMenu={(e) => onTokenContext(token, e)}
            onDrop={isOwn ? onTokenDrop : undefined}
          >
            <MagicTokenThumbnail token={token} />
          </DraggableItem>
        );
      })}
    </div>
  );
}
