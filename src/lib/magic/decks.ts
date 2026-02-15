/**
 * Deck list parser and prebuilt deck definitions.
 */

import { IMagicCardRef, IMagicDeckEntry } from "~/lib/magic/state";
import { getCardCollection, getCardImages, ScryfallCard } from "~/lib/magic/scryfall";

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a plain-text deck list.  Supports common formats:
 *
 *   4 Lightning Bolt
 *   4x Counterspell
 *   1 Black Lotus
 *
 * Lines starting with "//" or empty lines are ignored.
 * Sideboard headers ("Sideboard", "SB:") are ignored.
 */
export function parseDeckList(text: string): IMagicDeckEntry[] {
  const entries: IMagicDeckEntry[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    // Stop at sideboard sections
    if (/^(sideboard|sb:)/i.test(line)) break;

    const match = line.match(/^(\d+)x?\s+(.+)$/);
    if (match) {
      entries.push({ count: parseInt(match[1], 10), name: match[2].trim() });
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Resolve a deck list into IMagicCardRef[]
// ---------------------------------------------------------------------------

let nextInstanceId = 1;

function makeInstanceId(): string {
  return `card-${nextInstanceId++}-${Math.random().toString(36).slice(2, 8)}`;
}

function cardRefFromScryfall(card: ScryfallCard): Omit<IMagicCardRef, "instanceId"> {
  const images = getCardImages(card);
  return {
    scryfallId: card.id,
    name: card.name,
    imageSmall: images.small,
    imageNormal: images.normal,
    imageBack: images.back,
    tapped: false,
    faceDown: false,
    flipped: false,
    counters: 0,
  };
}

/**
 * Resolve a parsed deck list into a full set of IMagicCardRef[].
 * Fetches card data from Scryfall in batch.
 */
export async function resolveDeckList(entries: IMagicDeckEntry[]): Promise<IMagicCardRef[]> {
  // Deduplicate names for the API call
  const uniqueNames = Array.from(new Set(entries.map((e) => e.name)));
  const scryfallCards = await getCardCollection(uniqueNames.map((name) => ({ name })));

  // Build name→card map (case-insensitive)
  const byName = new Map<string, ScryfallCard>();
  for (const card of scryfallCards) {
    byName.set(card.name.toLowerCase(), card);
  }

  // Expand into individual card refs
  const refs: IMagicCardRef[] = [];
  for (const entry of entries) {
    const card = byName.get(entry.name.toLowerCase());
    if (!card) continue; // skip cards not found
    const base = cardRefFromScryfall(card);
    for (let i = 0; i < entry.count; i++) {
      refs.push({ ...base, instanceId: makeInstanceId() });
    }
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Prebuilt decks
// ---------------------------------------------------------------------------

export interface PrebuiltDeck {
  name: string;
  description: string;
  list: string;
}

export const PREBUILT_DECKS: PrebuiltDeck[] = [
  {
    name: "Red Aggro",
    description: "Fast creatures and burn spells",
    list: `4 Monastery Swiftspear
4 Goblin Guide
4 Zurgo Bellstriker
4 Bomat Courier
4 Lightning Bolt
4 Lava Spike
4 Rift Bolt
4 Searing Blaze
4 Skullcrack
4 Light Up the Stage
20 Mountain`,
  },
  {
    name: "Blue Control",
    description: "Counterspells and card advantage",
    list: `4 Delver of Secrets
4 Snapcaster Mage
4 Counterspell
4 Mana Leak
4 Brainstorm
4 Ponder
4 Force Spike
2 Cryptic Command
4 Fact or Fiction
2 Jace, the Mind Sculptor
24 Island`,
  },
  {
    name: "Green Stompy",
    description: "Big creatures that hit hard",
    list: `4 Llanowar Elves
4 Elvish Mystic
4 Strangleroot Geist
4 Steel Leaf Champion
4 Leatherback Baloth
4 Rancor
4 Aspect of Hydra
4 Vines of Vastwood
4 Collected Company
4 Experiment One
20 Forest`,
  },
  {
    name: "Black Devotion",
    description: "Removal and powerful threats",
    list: `4 Thoughtseize
4 Fatal Push
4 Dark Ritual
4 Phyrexian Obliterator
4 Gray Merchant of Asphodel
4 Geralf's Messenger
4 Gifted Aetherborn
4 Sign in Blood
4 Murderous Rider
4 Dread Shade
20 Swamp`,
  },
  {
    name: "White Weenies",
    description: "Small creatures with anthem effects",
    list: `4 Savannah Lions
4 Elite Vanguard
4 Thalia's Lieutenant
4 Benalish Marshal
4 Adanto Vanguard
4 Luminarch Aspirant
4 Brave the Elements
4 Honor of the Pure
4 Raise the Alarm
4 Swords to Plowshares
20 Plains`,
  },
];
