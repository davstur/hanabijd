import React from "react";
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
}

export default function MagicBattlefield({
  cards,
  tokens,
  isOwn,
  onCardClick,
  onCardContext,
  onTokenClick,
  onTokenContext,
}: Props) {
  const hasCards = cards.length > 0 || tokens.length > 0;

  return (
    <div
      className="w-100 pa2 br2"
      style={{
        minHeight: 120,
        background: isOwn ? "rgba(30,80,30,0.15)" : "rgba(80,30,30,0.15)",
        border: `1px solid ${isOwn ? "rgba(100,180,100,0.2)" : "rgba(180,100,100,0.2)"}`,
      }}
    >
      {!hasCards && (
        <div className="flex items-center justify-center h-100" style={{ minHeight: 100 }}>
          <span className="lavender f7 o-50">{isOwn ? "Your battlefield" : "Opponent battlefield"}</span>
        </div>
      )}
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {cards.map((card) => (
          <MagicCardThumbnail
            key={card.instanceId}
            card={card}
            onClick={() => onCardClick(card)}
            onContextMenu={(e) => onCardContext(card, e)}
          />
        ))}
        {tokens.map((token) => (
          <MagicTokenThumbnail
            key={token.instanceId}
            token={token}
            onClick={() => onTokenClick(token)}
            onContextMenu={(e) => onTokenContext(token, e)}
          />
        ))}
      </div>
    </div>
  );
}
