import classnames from "classnames";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button, { ButtonSize } from "~/components/ui/button";
import Txt, { TxtSize } from "~/components/ui/txt";
import { PREBUILT_DECKS, parseDeckList, resolveDeckList } from "~/lib/magic/decks";
import IMagicGameState, { IMagicCardRef } from "~/lib/magic/state";

interface Props {
  game: IMagicGameState;
  playerName: string;
  onJoinWithDeck: (deck: IMagicCardRef[]) => void;
  onStartGame: () => void;
}

export default function MagicLobby({ game, playerName, onJoinWithDeck, onStartGame }: Props) {
  const { t } = useTranslation();
  const [selectedPrebuilt, setSelectedPrebuilt] = useState<number | null>(null);
  const [customDeckText, setCustomDeckText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasJoined = game.players.some((p) => p.name === playerName);
  const allJoined = game.players.length >= game.options.playersCount;

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
      onJoinWithDeck(cards);
    } catch {
      setError("Failed to load deck. Please try again.");
    }
    setLoading(false);
  }

  async function handleImportDeck() {
    if (!customDeckText.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const entries = parseDeckList(customDeckText);
      if (entries.length === 0) {
        setError("Could not parse any cards from the decklist.");
        setLoading(false);
        return;
      }
      const cards = await resolveDeckList(entries);
      if (cards.length === 0) {
        setError("None of the card names were found on Scryfall.");
        setLoading(false);
        return;
      }
      onJoinWithDeck(cards);
    } catch {
      setError("Failed to import deck. Please check the format.");
    }
    setLoading(false);
  }

  return (
    <div className="w-100 h-100 flex flex-column items-center bg-main-dark pa3 overflow-y-auto">
      <Txt className="mb4" size={TxtSize.LARGE} value="Magic: The Gathering" />

      {/* Players */}
      <div className="mb4 w-100" style={{ maxWidth: 500 }}>
        <Txt className="ttu mb2 db" size={TxtSize.SMALL} value={t("players", "Players")} />
        <div className="flex items-center lavender mb1" style={{ gap: 8 }}>
          {game.players.map((p) => (
            <span key={p.name} className="pa1 ph2 br2 bg-white-10 f7">
              {p.name} ✓
            </span>
          ))}
          {Array.from({ length: game.options.playersCount - game.players.length }).map((_, i) => (
            <span key={`empty-${i}`} className="pa1 ph2 br2 bg-white-10 f7 o-40">
              {t("waitingForPlayers", "Waiting...")}
            </span>
          ))}
        </div>
        <Txt className="lavender mt1" size={TxtSize.SMALL} value={`Starting life: ${game.options.startingLife}`} />
      </div>

      {/* Deck selection (only if not yet joined) */}
      {!hasJoined && (
        <div className="w-100" style={{ maxWidth: 500 }}>
          <Txt className="mb3" size={TxtSize.MEDIUM} value="Choose your deck" />

          {/* Prebuilt decks */}
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

          {/* Import */}
          {!showImport ? (
            <Button
              void
              className="mb3"
              size={ButtonSize.SMALL}
              text="Import decklist"
              onClick={() => setShowImport(true)}
            />
          ) : (
            <div className="mb3">
              <Txt className="lavender mb2 db" size={TxtSize.SMALL} value='Paste decklist (format: "4 Card Name")' />
              <textarea
                className="w-100 pa2 br2 bg-white-10 white bn outline-0 f7"
                disabled={loading}
                rows={8}
                style={{ resize: "vertical", fontFamily: "monospace" }}
                value={customDeckText}
                onChange={(e) => setCustomDeckText(e.target.value)}
              />
              <Button
                className="mt2"
                disabled={loading || !customDeckText.trim()}
                primary={!loading}
                size={ButtonSize.SMALL}
                text={loading ? "Loading..." : "Import & Join"}
                onClick={handleImportDeck}
              />
            </div>
          )}

          {loading && <Txt className="lavender mt2" size={TxtSize.SMALL} value="Fetching cards from Scryfall..." />}
          {error && <Txt className="red mt2" size={TxtSize.SMALL} value={error} />}
        </div>
      )}

      {/* Start game */}
      {hasJoined && !allJoined && (
        <Txt className="lavender mt4" size={TxtSize.MEDIUM} value={t("waitingForPlayers", "Waiting for opponent...")} />
      )}

      {hasJoined && allJoined && (
        <Button
          className="mt4"
          primary
          size={ButtonSize.LARGE}
          text={t("startGame", "Start game")}
          onClick={onStartGame}
        />
      )}
    </div>
  );
}
