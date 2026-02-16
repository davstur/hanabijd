import classnames from "classnames";
import React from "react";
import { IMagicCardRef, IMagicToken } from "~/lib/magic/state";

const CARD_BACK_URL = "https://backs.scryfall.io/large/59/23/5923060e-3cfa-4059-9a13-089a79a27e17.jpg?1689900726";

/** Shared counter badge shown on cards and tokens. */
function CounterBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute bg-yellow main-dark fw7 f7 flex items-center justify-center br-100"
      style={{ bottom: 2, right: 2, width: 18, height: 18, fontSize: 10 }}
    >
      {count}
    </span>
  );
}

/** Style for a tappable item (card or token) on the battlefield. */
function tappableStyle(tapped: boolean, width: number, height: number): React.CSSProperties {
  return {
    width,
    height,
    transform: tapped ? "rotate(90deg)" : undefined,
    transformOrigin: "center center",
    transition: "transform 0.2s",
    flexShrink: 0,
  };
}

function getCardImageSrc(card: IMagicCardRef): string {
  if (card.faceDown) return CARD_BACK_URL;
  if (card.flipped && card.imageBack) return card.imageBack;
  return card.imageSmall;
}

interface CardProps {
  card: IMagicCardRef;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  small?: boolean;
}

export function MagicCardThumbnail({ card, onClick, onContextMenu, small }: CardProps) {
  const imgSrc = getCardImageSrc(card);
  const w = small ? 50 : 73;
  const h = small ? 70 : 102;

  return (
    <div
      className={classnames("relative pointer", { "o-80": card.tapped })}
      style={tappableStyle(card.tapped, w, h)}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <img
        alt={card.faceDown ? "Card back" : card.name}
        draggable={false}
        src={imgSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: small ? 3 : 5,
          WebkitTouchCallout: "none",
          userSelect: "none",
        }}
      />
      <CounterBadge count={card.counters} />
    </div>
  );
}

interface TokenProps {
  token: IMagicToken;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function MagicTokenThumbnail({ token, onClick, onContextMenu }: TokenProps) {
  return (
    <div
      className={classnames("relative pointer", { "o-80": token.tapped })}
      style={tappableStyle(token.tapped, 73, 102)}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {token.imageSmall ? (
        <img
          alt={token.name}
          draggable={false}
          src={token.imageSmall}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 5,
            WebkitTouchCallout: "none",
            userSelect: "none",
          }}
        />
      ) : (
        <div
          className="flex flex-column items-center justify-center bg-white-20 br2 h-100"
          style={{ border: "1px solid rgba(255,255,255,0.3)" }}
        >
          <span className="white f7 tc fw6">{token.name}</span>
          {token.pt && <span className="white f7">{token.pt}</span>}
        </div>
      )}
      <CounterBadge count={token.counters} />
    </div>
  );
}
