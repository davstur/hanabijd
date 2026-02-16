import React, { useCallback, useEffect, useRef, useState } from "react";
import Txt, { TxtSize } from "~/components/ui/txt";
import { getPlayerName } from "~/hooks/magic/game";
import { saveMagicDeck } from "~/lib/magic/firebase";
import { CardSearchFilters, searchCardsInSet, searchCardsPage, ScryfallCard, ScryfallList } from "~/lib/magic/scryfall";
import { IMagicDeckEntry, IMagicSavedDeck } from "~/lib/magic/state";

import CardFilters from "./CardFilters";
import CardResults from "./CardResults";
import DeckList from "./DeckList";
import SetSelector from "./SetSelector";

interface Props {
  /** Pre-populate the builder with a saved deck for editing. */
  initialDeck?: IMagicSavedDeck;
  onSaved?: (deck: IMagicSavedDeck) => void;
  onBack?: () => void;
}

export default function DeckBuilder({ initialDeck, onSaved, onBack }: Props) {
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [filters, setFilters] = useState<CardSearchFilters>({});
  const [cards, setCards] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Deck state
  const [deckEntries, setDeckEntries] = useState<IMagicDeckEntry[]>(initialDeck?.cards || []);
  const [deckName, setDeckName] = useState(initialDeck?.name || "");
  const [deckId] = useState(initialDeck?.id || `deck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  // Mobile deck panel
  const [showMobileDeck, setShowMobileDeck] = useState(false);

  // Track search request to prevent stale responses
  const searchIdRef = useRef(0);

  // Search cards when set or filters change
  useEffect(() => {
    if (!selectedSet) {
      setCards([]);
      setHasMore(false);
      setNextPage(undefined);
      return;
    }

    const id = ++searchIdRef.current;
    setLoading(true);

    searchCardsInSet(selectedSet, filters).then((result: ScryfallList) => {
      if (id !== searchIdRef.current) return;
      setCards(result.data);
      setHasMore(result.has_more);
      setNextPage(result.next_page);
      setLoading(false);
    });
  }, [selectedSet, filters]);

  const handleLoadMore = useCallback(() => {
    if (!nextPage || loading) return;
    setLoading(true);
    searchCardsPage(nextPage).then((result: ScryfallList) => {
      setCards((prev) => [...prev, ...result.data]);
      setHasMore(result.has_more);
      setNextPage(result.next_page);
      setLoading(false);
    });
  }, [nextPage, loading]);

  const addCard = useCallback((name: string) => {
    setDeckEntries((prev) => {
      const existing = prev.find((e) => e.name === name);
      if (existing) {
        return prev.map((e) => (e.name === name ? { ...e, count: e.count + 1 } : e));
      }
      return [...prev, { name, count: 1 }];
    });
  }, []);

  const incrementCard = useCallback((name: string) => {
    setDeckEntries((prev) => prev.map((e) => (e.name === name ? { ...e, count: e.count + 1 } : e)));
  }, []);

  const decrementCard = useCallback((name: string) => {
    setDeckEntries((prev) =>
      prev.map((e) => (e.name === name ? { ...e, count: e.count - 1 } : e)).filter((e) => e.count > 0)
    );
  }, []);

  const removeCard = useCallback((name: string) => {
    setDeckEntries((prev) => prev.filter((e) => e.name !== name));
  }, []);

  const handleSave = useCallback(async () => {
    const playerName = getPlayerName();
    if (!playerName) {
      alert("Set your player name first (go to the home page).");
      return;
    }
    if (!deckName.trim()) {
      alert("Enter a deck name.");
      return;
    }
    if (deckEntries.length === 0) {
      alert("Add some cards to your deck first.");
      return;
    }

    setSaving(true);
    const now = Date.now();
    const deck: IMagicSavedDeck = {
      id: deckId,
      name: deckName.trim(),
      cards: deckEntries,
      createdAt: initialDeck?.createdAt || now,
      updatedAt: now,
    };

    await saveMagicDeck(playerName, deck);
    setSaving(false);
    onSaved?.(deck);
  }, [deckId, deckName, deckEntries, initialDeck, onSaved]);

  const totalCards = deckEntries.reduce((sum, e) => sum + e.count, 0);

  return (
    <div className="w-100 h-100 flex flex-column bg-main-dark">
      {/* Header */}
      <div className="flex items-center justify-between pa2 ph3 bb b--white-20">
        <button className="pointer bn bg-transparent white f6" onClick={onBack}>
          &larr; Back
        </button>
        <Txt className="white fw6" size={TxtSize.SMALL} value="Deck Builder" />
        <button className="pointer br2 pa2 ph3 bn bg-cta main-dark fw6 f6" disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Body — desktop: two columns; mobile: stacked */}
      <div className="flex flex-auto" style={{ minHeight: 0 }}>
        {/* Left: set selector + filters + results */}
        <div className="flex flex-column flex-auto pa3" style={{ minHeight: 0, minWidth: 0 }}>
          {/* Top row: set selector + filters side by side on desktop */}
          <div className="flex mb3" style={{ gap: 16, minHeight: 0 }}>
            <div className="flex flex-column" style={{ width: 200, flexShrink: 0, maxHeight: 300 }}>
              <SetSelector selectedSet={selectedSet} onSelectSet={setSelectedSet} />
            </div>
            <div style={{ width: 220, flexShrink: 0 }}>
              <CardFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          </div>

          {/* Card results */}
          <div className="flex-auto" style={{ minHeight: 0 }}>
            <CardResults
              cards={cards}
              hasMore={hasMore}
              loading={loading}
              onAddCard={addCard}
              onLoadMore={handleLoadMore}
            />
          </div>
        </div>

        {/* Right: deck list — hidden on mobile */}
        <div className="flex-column pa3 bl b--white-20 dn flex-l" style={{ width: 280, flexShrink: 0, minHeight: 0 }}>
          <DeckList
            deckName={deckName}
            entries={deckEntries}
            onDeckNameChange={setDeckName}
            onDecrement={decrementCard}
            onIncrement={incrementCard}
            onRemove={removeCard}
          />
        </div>
      </div>

      {/* Mobile: floating badge + bottom sheet */}
      <div className="dn-l">
        <button
          className="fixed pointer br-pill pa2 ph3 bn bg-cta main-dark fw7 f6 shadow-2 z-5"
          style={{ bottom: 16, right: 16 }}
          onClick={() => setShowMobileDeck(!showMobileDeck)}
        >
          Deck ({totalCards})
        </button>

        {showMobileDeck && (
          <div
            className="fixed bottom-0 left-0 right-0 bg-main-dark pa3 z-5 overflow-y-auto"
            style={{ maxHeight: "60vh", borderTop: "2px solid rgba(255,255,255,0.2)" }}
          >
            <div className="flex justify-between items-center mb2">
              <Txt className="white fw6" size={TxtSize.SMALL} value="Your Deck" />
              <button className="pointer bn bg-transparent white f5" onClick={() => setShowMobileDeck(false)}>
                &times;
              </button>
            </div>
            <DeckList
              deckName={deckName}
              entries={deckEntries}
              onDeckNameChange={setDeckName}
              onDecrement={decrementCard}
              onIncrement={incrementCard}
              onRemove={removeCard}
            />
          </div>
        )}
      </div>
    </div>
  );
}
