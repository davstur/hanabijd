import React, { useEffect, useRef } from "react";
import { IMagicCardRef, IMagicToken } from "~/lib/magic/state";

interface Props {
  card?: IMagicCardRef | null;
  token?: IMagicToken | null;
  onClose: () => void;
}

export default function MagicCardZoom({ card, token, onClose }: Props) {
  const openedAt = useRef(0);

  useEffect(() => {
    if (card || token) {
      openedAt.current = Date.now();
    }
  }, [card, token]);

  if (!card && !token) return null;

  const imgSrc = card ? (card.flipped && card.imageBack ? card.imageBack : card.imageNormal) : token?.imageNormal || "";

  const name = card ? card.name : token?.name || "";

  return (
    <div
      className="fixed top-0 left-0 w-100 h-100 flex items-center justify-center z-999"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={() => {
        if (Date.now() - openedAt.current >= 500) onClose();
      }}
    >
      <div
        style={{
          maxWidth: "min(488px, 90vw)",
          maxHeight: "90vh",
        }}
      >
        {imgSrc ? (
          <img
            alt={name}
            src={imgSrc}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        ) : (
          <div className="flex items-center justify-center bg-white-20 br3" style={{ width: 300, height: 420 }}>
            <span className="white f3">{name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
