import classnames from "classnames";
import React, { useState } from "react";
import Txt, { TxtSize } from "~/components/ui/txt";
import { PREBUILT_DECKS, parseDeckList, resolveDeckList } from "~/lib/magic/decks";
import { IMagicCardRef } from "~/lib/magic/state";

interface Props {
  onSelectDeck: (deck: IMagicCardRef[]) => void;
}

export default function MagicLobby({ onSelectDeck }: Props) {
  const [selectedPrebuilt, setSelectedPrebuilt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectPrebuilt(index: number) {
    setSelectedPrebuilt(index);
    setError(null);
    setLoading(true);

    try {
      const deck = PREBUILT_DECKS[index];
      const entries = parseDeckList(deck.list);
      const cards = await resolveDeckList(entries);
      if (cards.length === 0) {
        setError("Failed to load deck cards. Check your internet connection.");
        setLoading(false);
        return;
      }
      onSelectDeck(cards);
    } catch {
      setError("Failed to load deck. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="w-100 h-100 flex flex-column items-center bg-main-dark pa3 overflow-y-auto">
      <Txt className="mb4 mt4" size={TxtSize.LARGE} value="Magic: The Gathering" />

      <div className="w-100" style={{ maxWidth: 500 }}>
        <Txt className="mb3" size={TxtSize.MEDIUM} value="Choose your deck" />

        <div className="flex flex-wrap mb3" style={{ gap: 8 }}>
          {PREBUILT_DECKS.map((deck, i) => (
            <button
              key={i}
              className={classnames("pointer br2 pa2 ph3 bn shadow-1 tl grow", {
                "bg-cta main-dark": selectedPrebuilt === i,
                "bg-white-10 white": selectedPrebuilt !== i,
              })}
              disabled={loading}
              style={{ minWidth: 120 }}
              onClick={() => handleSelectPrebuilt(i)}
            >
              <div className="fw6 f6">{deck.name}</div>
              <div className="f7 o-70 mt1">{deck.description}</div>
            </button>
          ))}
        </div>

        {loading && <Txt className="lavender mt2" size={TxtSize.SMALL} value="Fetching cards from Scryfall..." />}
        {error && <Txt className="red mt2" size={TxtSize.SMALL} value={error} />}
      </div>
    </div>
  );
}
