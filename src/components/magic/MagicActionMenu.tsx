import React from "react";
import { IMagicCardRef, MagicZone } from "~/lib/magic/state";

interface Props {
  card: IMagicCardRef;
  currentZone: MagicZone;
  position: { x: number; y: number };
  onAction: (action: string, payload?: unknown) => void;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  action: string;
  payload?: unknown;
}

export default function MagicActionMenu({ card, currentZone, position, onAction, onClose }: Props) {
  const items: MenuItem[] = [];

  // Move-to options (show all zones except current)
  if (currentZone !== MagicZone.HAND) {
    items.push({ label: "To Hand", action: "move", payload: MagicZone.HAND });
  }
  if (currentZone !== MagicZone.BATTLEFIELD) {
    items.push({ label: "To Battlefield", action: "move", payload: MagicZone.BATTLEFIELD });
  }
  if (currentZone !== MagicZone.GRAVEYARD) {
    items.push({ label: "To Graveyard", action: "move", payload: MagicZone.GRAVEYARD });
  }
  if (currentZone !== MagicZone.EXILE) {
    items.push({ label: "To Exile", action: "move", payload: MagicZone.EXILE });
  }
  if (currentZone !== MagicZone.LIBRARY) {
    items.push({ label: "Top of Library", action: "move", payload: { zone: MagicZone.LIBRARY, position: "top" } });
    items.push({
      label: "Bottom of Library",
      action: "move",
      payload: { zone: MagicZone.LIBRARY, position: "bottom" },
    });
  }

  // Card state actions (only on battlefield)
  if (currentZone === MagicZone.BATTLEFIELD) {
    items.push({ label: card.tapped ? "Untap" : "Tap", action: "tap" });
    items.push({ label: card.faceDown ? "Turn Face Up" : "Turn Face Down", action: "faceDown" });
    if (card.imageBack) {
      items.push({ label: "Flip (DFC)", action: "flip" });
    }
    items.push({ label: "+1 Counter", action: "counter", payload: 1 });
    if (card.counters > 0) {
      items.push({ label: "-1 Counter", action: "counter", payload: -1 });
    }
  }

  // Zoom
  items.push({ label: "View Card", action: "zoom" });

  // Clamp menu position to viewport
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    left: Math.min(position.x, window.innerWidth - 180),
    top: Math.min(position.y, window.innerHeight - items.length * 36 - 16),
    zIndex: 1000,
    minWidth: 160,
  };

  return (
    <>
      <div className="fixed top-0 left-0 w-100 h-100 z-999" onClick={onClose} />
      <div className="bg-main-dark br2 shadow-3 overflow-hidden z-9999" style={menuStyle}>
        {items.map((item, i) => (
          <button
            key={i}
            className="db w-100 tl pa2 ph3 pointer white bg-transparent bn hover-bg-white-20 f7"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
            onClick={() => {
              onAction(item.action, item.payload);
              onClose();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
