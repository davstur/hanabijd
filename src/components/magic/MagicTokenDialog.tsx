import React, { useState } from "react";
import Button, { ButtonSize } from "~/components/ui/button";
import { TextInput } from "~/components/ui/forms";
import Txt, { TxtSize } from "~/components/ui/txt";
import { searchTokens, getCardImages, ScryfallCard } from "~/lib/magic/scryfall";
import { IMagicToken } from "~/lib/magic/state";

interface Props {
  onCreateToken: (token: Omit<IMagicToken, "instanceId" | "tapped" | "counters">) => void;
  onClose: () => void;
}

export default function MagicTokenDialog({ onCreateToken, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPT, setCustomPT] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    const tokens = await searchTokens(query.trim());
    setResults(tokens);
    setSearching(false);
  }

  function handleSelectToken(card: ScryfallCard) {
    const images = getCardImages(card);
    onCreateToken({
      scryfallId: card.id,
      name: card.name,
      imageSmall: images.small,
      imageNormal: images.normal,
      pt: card.power && card.toughness ? `${card.power}/${card.toughness}` : undefined,
    });
    onClose();
  }

  function handleCreateCustom() {
    if (!customName.trim()) return;
    onCreateToken({
      name: customName.trim(),
      imageSmall: "",
      imageNormal: "",
      pt: customPT.trim() || undefined,
    });
    onClose();
  }

  return (
    <div
      className="fixed top-0 left-0 w-100 h-100 flex items-center justify-center z-999"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="bg-main-dark br3 pa3 overflow-y-auto"
        style={{ maxWidth: "90vw", maxHeight: "80vh", width: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb3">
          <Txt size={TxtSize.MEDIUM} value="Create Token" />
          <button className="pointer bg-transparent white bn f4" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Search for token */}
        <div className="mb3">
          <Txt className="mb2 db lavender" size={TxtSize.SMALL} value="Search Scryfall tokens" />
          <div className="flex items-center" style={{ gap: 6 }}>
            <TextInput
              autoFocus
              className="flex-auto"
              placeholder="e.g. Soldier, Zombie..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              disabled={searching}
              size={ButtonSize.TINY}
              text={searching ? "..." : "Search"}
              onClick={handleSearch}
            />
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mb3 overflow-y-auto" style={{ maxHeight: 200 }}>
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {results.slice(0, 20).map((card) => {
                const images = getCardImages(card);
                return (
                  <div
                    key={card.id}
                    className="pointer grow"
                    style={{ width: 73, height: 102 }}
                    onClick={() => handleSelectToken(card)}
                  >
                    <img
                      alt={card.name}
                      src={images.small}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 5 }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom token */}
        <div className="bt b--white-20 pt3">
          <Txt className="mb2 db lavender" size={TxtSize.SMALL} value="Or create a custom token" />
          <div className="flex items-center mb2" style={{ gap: 6 }}>
            <TextInput
              className="flex-auto"
              placeholder="Token name (e.g. Soldier)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <TextInput
              className="w3"
              placeholder="P/T"
              value={customPT}
              onChange={(e) => setCustomPT(e.target.value)}
            />
          </div>
          <Button
            disabled={!customName.trim()}
            size={ButtonSize.SMALL}
            text="Create Custom Token"
            onClick={handleCreateCustom}
          />
        </div>
      </div>
    </div>
  );
}
