import React from "react";
import { IMagicCardRef, MagicZone } from "~/lib/magic/state";
import { MagicCardThumbnail } from "~/components/magic/MagicCardThumbnail";
import Txt, { TxtSize } from "~/components/ui/txt";

interface Props {
  zone: MagicZone;
  cards: IMagicCardRef[];
  onCardClick: (card: IMagicCardRef) => void;
  onCardContext: (card: IMagicCardRef, e: React.MouseEvent) => void;
  onClose: () => void;
}

const ZoneNames: Record<MagicZone, string> = {
  [MagicZone.LIBRARY]: "Library",
  [MagicZone.HAND]: "Hand",
  [MagicZone.BATTLEFIELD]: "Battlefield",
  [MagicZone.GRAVEYARD]: "Graveyard",
  [MagicZone.EXILE]: "Exile",
};

export default function MagicZoneViewer({ zone, cards, onCardClick, onCardContext, onClose }: Props) {
  return (
    <div
      className="fixed top-0 left-0 w-100 h-100 flex items-center justify-center z-999"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={onClose}
    >
      <div
        className="bg-main-dark br3 pa3 overflow-y-auto"
        style={{ maxWidth: "90vw", maxHeight: "80vh", minWidth: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb3">
          <Txt size={TxtSize.MEDIUM} value={`${ZoneNames[zone]} (${cards.length})`} />
          <button className="pointer bg-transparent white bn f4" onClick={onClose}>
            ×
          </button>
        </div>
        {cards.length === 0 && <span className="lavender f6">Empty</span>}
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {cards.map((card) => (
            <MagicCardThumbnail
              key={card.instanceId}
              card={{ ...card, faceDown: false }}
              onClick={() => onCardClick(card)}
              onContextMenu={(e) => onCardContext(card, e)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
