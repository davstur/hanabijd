import classnames from "classnames";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import Txt, { TxtSize } from "~/components/ui/txt";
import { getPlayerName } from "~/hooks/magic/game";
import { deleteMagicDeck, loadMagicDecks } from "~/lib/magic/firebase";
import { PREBUILT_DECKS, parseDeckList, resolveDeckList } from "~/lib/magic/decks";
import { IMagicCardRef, IMagicSavedDeck } from "~/lib/magic/state";

type Tab = "prebuilt" | "my-decks" | "build";

interface Props {
  onSelectDeck: (deck: IMagicCardRef[]) => void;
}

export default function MagicLobby({ onSelectDeck }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("prebuilt");
  const [selectedPrebuilt, setSelectedPrebuilt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // My Decks state
  const [savedDecks, setSavedDecks] = useState<IMagicSavedDeck[]>([]);
  const [decksLoading, setDecksLoading] = useState(false);

  useEffect(() => {
    if (tab === "my-decks") {
      const playerName = getPlayerName();
      if (!playerName) return;
      setDecksLoading(true);
      loadMagicDecks(playerName).then((decks) => {
        setSavedDecks(decks.sort((a, b) => b.updatedAt - a.updatedAt));
        setDecksLoading(false);
      });
    }
  }, [tab]);

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

  async function handleSelectSaved(deck: IMagicSavedDeck) {
    setError(null);
    setLoading(true);

    try {
      const cards = await resolveDeckList(deck.cards);
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

  async function handleDeleteSaved(deckId: string) {
    const playerName = getPlayerName();
    if (!playerName) return;
    await deleteMagicDeck(playerName, deckId);
    setSavedDecks((prev) => prev.filter((d) => d.id !== deckId));
  }

  return (
    <div className="w-100 h-100 flex flex-column items-center bg-main-dark pa3 overflow-y-auto">
      <Txt className="mb4 mt4" size={TxtSize.LARGE} value="Magic: The Gathering" />

      <div className="w-100" style={{ maxWidth: 500 }}>
        {/* Tabs */}
        <div className="flex mb3" style={{ gap: 4 }}>
          {[
            { id: "prebuilt" as Tab, label: "Prebuilt Decks" },
            { id: "my-decks" as Tab, label: "My Decks" },
            { id: "build" as Tab, label: "Build New" },
          ].map((t) => (
            <button
              key={t.id}
              className={classnames("pointer br2 pa2 ph3 bn f6", {
                "bg-cta main-dark fw6": tab === t.id,
                "bg-white-10 white": tab !== t.id,
              })}
              onClick={() => {
                if (t.id === "build") {
                  router.push("/magic/deck-builder");
                } else {
                  setTab(t.id);
                }
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Prebuilt Decks tab */}
        {tab === "prebuilt" && (
          <>
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
          </>
        )}

        {/* My Decks tab */}
        {tab === "my-decks" && (
          <>
            <Txt className="mb3" size={TxtSize.MEDIUM} value="Your saved decks" />
            {decksLoading && <Txt className="lavender" size={TxtSize.SMALL} value="Loading decks..." />}
            {!decksLoading && savedDecks.length === 0 && (
              <Txt className="o-50" size={TxtSize.SMALL} value="No saved decks yet. Use Build New to create one." />
            )}
            <div className="flex flex-wrap mb3" style={{ gap: 8 }}>
              {savedDecks.map((deck) => {
                const totalCards = deck.cards.reduce((sum, e) => sum + e.count, 0);
                return (
                  <div key={deck.id} className="relative">
                    <button
                      className="pointer br2 pa2 ph3 bn shadow-1 tl grow bg-white-10 white"
                      disabled={loading}
                      style={{ minWidth: 120 }}
                      onClick={() => handleSelectSaved(deck)}
                    >
                      <div className="fw6 f6">{deck.name}</div>
                      <div className="f7 o-70 mt1">{totalCards} cards</div>
                    </button>
                    <button
                      className="absolute pointer bn bg-transparent red f7"
                      style={{ top: 2, right: 2 }}
                      title="Delete deck"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSaved(deck.id);
                      }}
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {loading && <Txt className="lavender mt2" size={TxtSize.SMALL} value="Fetching cards from Scryfall..." />}
        {error && <Txt className="red mt2" size={TxtSize.SMALL} value={error} />}
      </div>
    </div>
  );
}
