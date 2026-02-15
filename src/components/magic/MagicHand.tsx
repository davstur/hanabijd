import React from "react";
import { IMagicCardRef } from "~/lib/magic/state";
import { MagicCardThumbnail } from "~/components/magic/MagicCardThumbnail";

interface Props {
  cards: IMagicCardRef[];
  onCardClick: (card: IMagicCardRef) => void;
  onCardContext: (card: IMagicCardRef, e: React.MouseEvent) => void;
}

export default function MagicHand({ cards, onCardClick, onCardContext }: Props) {
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
          <MagicCardThumbnail
            key={card.instanceId}
            card={card}
            small
            onClick={() => onCardClick(card)}
            onContextMenu={(e) => onCardContext(card, e)}
          />
        ))}
      </div>
    </div>
  );
}
