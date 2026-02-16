import React from "react";
import { IMagicPlayer } from "~/lib/magic/state";
import Txt, { TxtSize } from "~/components/ui/txt";

interface Props {
  player: IMagicPlayer;
  isCurrent: boolean;
}

export default function MagicPlayerBar({ player, isCurrent }: Props) {
  return (
    <div
      className="flex items-center justify-between pa2 br2 mb1"
      style={{
        background: isCurrent ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
        border: isCurrent ? "1px solid rgba(255,200,0,0.3)" : "1px solid transparent",
      }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        <Txt className="white fw6" size={TxtSize.SMALL} value={player.name} />
        <span className="lavender f7">Life: {player.life}</span>
      </div>
    </div>
  );
}
