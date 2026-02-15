import React, { useState } from "react";
import Button, { ButtonSize } from "~/components/ui/button";

interface Props {
  onDraw: () => void;
  onUntapAll: () => void;
  onShuffle: () => void;
  onMulligan: () => void;
  onPassTurn: () => void;
  onRestart: () => void;
  onConcede: () => void;
  onCreateToken: () => void;
}

export default function MagicToolbar({
  onDraw,
  onUntapAll,
  onShuffle,
  onMulligan,
  onPassTurn,
  onRestart,
  onConcede,
  onCreateToken,
}: Props) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
      <Button size={ButtonSize.TINY} text="Draw" onClick={onDraw} />
      <Button size={ButtonSize.TINY} text="Untap All" onClick={onUntapAll} />
      <Button size={ButtonSize.TINY} text="Pass Turn" onClick={onPassTurn} />
      <Button size={ButtonSize.TINY} text="Token" onClick={onCreateToken} />
      <Button size={ButtonSize.TINY} text={showMore ? "Less ▲" : "More ▼"} onClick={() => setShowMore(!showMore)} />
      {showMore && (
        <>
          <Button size={ButtonSize.TINY} text="Shuffle" onClick={onShuffle} />
          <Button size={ButtonSize.TINY} text="Mulligan" onClick={onMulligan} />
          <Button size={ButtonSize.TINY} text="Restart" onClick={onRestart} />
          <Button size={ButtonSize.TINY} text="Concede" onClick={onConcede} />
        </>
      )}
    </div>
  );
}
