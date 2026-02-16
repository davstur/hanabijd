import React, { useCallback, useRef, useState } from "react";
import MagicCardZoom from "~/components/magic/MagicCardZoom";
import Txt, { TxtSize } from "~/components/ui/txt";
import { getCardImages, ScryfallCard } from "~/lib/magic/scryfall";
import { IMagicCardRef } from "~/lib/magic/state";

interface Props {
  cards: ScryfallCard[];
  loading: boolean;
  hasMore: boolean;
  onAddCard: (name: string) => void;
  onLoadMore: () => void;
}

export default function CardResults({ cards, loading, hasMore, onAddCard, onLoadMore }: Props) {
  const [zoomCard, setZoomCard] = useState<IMagicCardRef | null>(null);
  const lastTapRef = useRef<{ name: string; time: number } | null>(null);

  const handleTap = useCallback(
    (card: ScryfallCard) => {
      const now = Date.now();
      const last = lastTapRef.current;

      if (last && last.name === card.name && now - last.time < 400) {
        // Double tap — zoom
        const images = getCardImages(card);
        setZoomCard({
          instanceId: card.id,
          scryfallId: card.id,
          name: card.name,
          imageSmall: images.small,
          imageNormal: images.normal,
          imageBack: images.back,
          tapped: false,
          faceDown: false,
          flipped: false,
          counters: 0,
        });
        lastTapRef.current = null;
      } else {
        // Single tap — add to deck
        lastTapRef.current = { name: card.name, time: now };
        onAddCard(card.name);
      }
    },
    [onAddCard]
  );

  if (!loading && cards.length === 0) {
    return (
      <div className="flex items-center justify-center pa3 o-50">
        <Txt size={TxtSize.XSMALL} value="No cards found. Select a set or adjust filters." />
      </div>
    );
  }

  return (
    <div className="flex flex-column" style={{ minHeight: 0 }}>
      <div className="overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
        <div className="flex flex-wrap" style={{ gap: 4 }}>
          {cards.map((card) => {
            const images = getCardImages(card);
            return (
              <div
                key={card.id}
                className="pointer grow"
                style={{ width: 100, flexShrink: 0 }}
                onClick={() => handleTap(card)}
              >
                {images.small ? (
                  <img
                    alt={card.name}
                    draggable={false}
                    src={images.small}
                    style={{
                      width: "100%",
                      height: "auto",
                      borderRadius: 4,
                      display: "block",
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center bg-white-20 br2" style={{ width: 100, height: 140 }}>
                    <span className="white f7 tc">{card.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loading && <Txt className="o-70 mt2 db tc" size={TxtSize.XSMALL} value="Loading cards..." />}

        {hasMore && !loading && (
          <button className="db w-100 pointer br2 pa2 mt2 bn bg-white-10 white f7 tc" onClick={onLoadMore}>
            Load more
          </button>
        )}
      </div>

      <MagicCardZoom card={zoomCard} onClose={() => setZoomCard(null)} />
    </div>
  );
}
