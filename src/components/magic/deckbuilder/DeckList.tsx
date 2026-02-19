import React from "react";
import Txt, { TxtSize } from "~/components/ui/txt";
import { IMagicDeckEntry } from "~/lib/magic/state";

const BASIC_LANDS = new Set(["plains", "island", "swamp", "mountain", "forest"]);

interface Props {
  entries: IMagicDeckEntry[];
  deckName: string;
  onDeckNameChange: (name: string) => void;
  onIncrement: (name: string) => void;
  onDecrement: (name: string) => void;
  onRemove: (name: string) => void;
}

export default function DeckList({ entries, deckName, onDeckNameChange, onIncrement, onDecrement, onRemove }: Props) {
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  const warnings: string[] = [];

  if (total < 60) {
    warnings.push(`${total}/60 cards — minimum 60 recommended`);
  }

  const overLimit = entries.filter((e) => e.count > 4 && !BASIC_LANDS.has(e.name.toLowerCase()));
  for (const e of overLimit) {
    warnings.push(`${e.name}: ${e.count} copies (max 4)`);
  }

  return (
    <div className="flex flex-column h-100">
      <input
        className="mb2 pa2 br2 bn bg-white-10 white f6 fw6"
        placeholder="Deck name..."
        type="text"
        value={deckName}
        onChange={(e) => onDeckNameChange(e.target.value)}
      />

      <div className="mb2 flex justify-between items-center">
        <Txt className="white fw6" size={TxtSize.XSMALL} value={`${total} cards`} />
        {total >= 60 && <span className="f7 green">Ready</span>}
      </div>

      {warnings.length > 0 && (
        <div className="mb2">
          {warnings.map((w, i) => (
            <div key={i} className="f7 yellow mb1">
              {w}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
        {entries.length === 0 && <div className="o-50 f7 tc pa3">Tap cards on the left to add them to your deck.</div>}
        {entries.map((entry) => (
          <div key={entry.name} className="flex items-center mb1 ph1" style={{ gap: 4 }}>
            <button
              className="pointer bn bg-white-20 white br2 f7 pa1 ph2 flex-shrink-0"
              onClick={() => onDecrement(entry.name)}
            >
              -
            </button>
            <span className="white f7 fw6 flex-shrink-0" style={{ minWidth: 16, textAlign: "center" }}>
              {entry.count}
            </span>
            <button
              className="pointer bn bg-white-20 white br2 f7 pa1 ph2 flex-shrink-0"
              onClick={() => onIncrement(entry.name)}
            >
              +
            </button>
            <span className="white f7 flex-auto truncate">{entry.name}</span>
            <button
              className="pointer bn bg-transparent red f7 pa0 flex-shrink-0"
              title="Remove"
              onClick={() => onRemove(entry.name)}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
