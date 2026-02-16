/**
 * Scryfall API client with client-side caching and rate limiting.
 *
 * Scryfall asks for 50-100ms between requests.  We enforce a minimum
 * 100ms gap via a simple queue.  Card data is cached in memory for the
 * duration of the page session.
 *
 * @see https://scryfall.com/docs/api
 */

// ---------------------------------------------------------------------------
// Types (subset of the Scryfall Card object we actually use)
// ---------------------------------------------------------------------------

export interface ScryfallImageUris {
  small: string;
  normal: string;
  border_crop: string;
}

export interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  image_uris?: ScryfallImageUris;
  power?: string;
  toughness?: string;
}

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  layout: string;
  /** For tokens */
  power?: string;
  toughness?: string;
  set: string;
  set_name?: string;
  cmc?: number;
  colors?: string[];
  color_identity?: string[];
}

export interface ScryfallList {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
  total_cards?: number;
}

export interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  card_count: number;
  icon_svg_uri?: string;
  block?: string;
  block_code?: string;
}

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

let lastRequestTime = 0;
const MIN_DELAY_MS = 100;

async function throttledFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((r) => setTimeout(r, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cardCache = new Map<string, ScryfallCard>();

function cacheCard(card: ScryfallCard) {
  cardCache.set(card.id, card);
  // Also index by lowercase name for name lookups
  cardCache.set(`name:${card.name.toLowerCase()}`, card);
}

export function getCachedCard(scryfallId: string): ScryfallCard | undefined {
  return cardCache.get(scryfallId);
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

const API = "https://api.scryfall.com";

/** Autocomplete card names (up to 20 results). */
export async function autocompleteCard(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  const res = await throttledFetch(`${API}/cards/autocomplete?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data as string[];
}

/** Get a card by exact name. */
export async function getCardByName(name: string): Promise<ScryfallCard | null> {
  const cached = cardCache.get(`name:${name.toLowerCase()}`);
  if (cached) return cached;

  const res = await throttledFetch(`${API}/cards/named?exact=${encodeURIComponent(name)}`);
  if (!res.ok) return null;
  const card: ScryfallCard = await res.json();
  cacheCard(card);
  return card;
}

/** Get a card by Scryfall UUID. */
export async function getCardById(id: string): Promise<ScryfallCard | null> {
  const cached = cardCache.get(id);
  if (cached) return cached;

  const res = await throttledFetch(`${API}/cards/${id}`);
  if (!res.ok) return null;
  const card: ScryfallCard = await res.json();
  cacheCard(card);
  return card;
}

/** Batch-fetch up to 75 cards by identifier. */
export async function getCardCollection(identifiers: { name: string }[]): Promise<ScryfallCard[]> {
  if (identifiers.length === 0) return [];

  // Chunk into batches of 75 (Scryfall limit)
  const results: ScryfallCard[] = [];
  for (let i = 0; i < identifiers.length; i += 75) {
    const chunk = identifiers.slice(i, i + 75);
    const res = await throttledFetch(`${API}/cards/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: chunk }),
    });
    if (!res.ok) continue;
    const json = await res.json();
    for (const card of json.data as ScryfallCard[]) {
      cacheCard(card);
      results.push(card);
    }
  }
  return results;
}

/** Search for token cards related to a query. */
export async function searchTokens(query: string): Promise<ScryfallCard[]> {
  const res = await throttledFetch(
    `${API}/cards/search?q=${encodeURIComponent(query)}+t%3Atoken&unique=art&order=name`
  );
  if (!res.ok) return [];
  const json: ScryfallList = await res.json();
  return json.data;
}

/** Search cards with a Scryfall search query string. */
export async function searchCards(query: string): Promise<ScryfallCard[]> {
  const res = await throttledFetch(`${API}/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=name`);
  if (!res.ok) return [];
  const json: ScryfallList = await res.json();
  for (const card of json.data) cacheCard(card);
  return json.data;
}

// ---------------------------------------------------------------------------
// Sets API
// ---------------------------------------------------------------------------

const PLAYABLE_SET_TYPES = new Set(["core", "expansion", "masters", "draft_innovation"]);

let setsCache: ScryfallSet[] | null = null;

/** Fetch all playable sets, sorted by release date descending. Cached. */
export async function fetchSets(): Promise<ScryfallSet[]> {
  if (setsCache) return setsCache;

  const res = await throttledFetch(`${API}/sets`);
  if (!res.ok) return [];
  const json: { data: ScryfallSet[] } = await res.json();

  setsCache = json.data
    .filter((s) => PLAYABLE_SET_TYPES.has(s.set_type) && s.card_count > 0)
    .sort((a, b) => (b.released_at || "").localeCompare(a.released_at || ""));

  return setsCache;
}

export interface CardSearchFilters {
  name?: string;
  colors?: string[];
  cmc?: number | null;
}

/** Search for cards within a specific set, with optional filters. */
export async function searchCardsInSet(setCode: string, filters: CardSearchFilters = {}): Promise<ScryfallList> {
  const parts: string[] = [`set:${setCode}`];

  if (filters.name) {
    parts.push(filters.name);
  }
  if (filters.colors && filters.colors.length > 0) {
    parts.push(`c:${filters.colors.join("")}`);
  }
  if (filters.cmc !== undefined && filters.cmc !== null) {
    parts.push(`cmc=${filters.cmc}`);
  }

  const query = parts.join(" ");
  const res = await throttledFetch(`${API}/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=name`);
  if (!res.ok) return { data: [], has_more: false };
  const json: ScryfallList = await res.json();
  for (const card of json.data) cacheCard(card);
  return json;
}

/** Fetch the next page of card search results. */
export async function searchCardsPage(nextPageUrl: string): Promise<ScryfallList> {
  const res = await throttledFetch(nextPageUrl);
  if (!res.ok) return { data: [], has_more: false };
  const json: ScryfallList = await res.json();
  for (const card of json.data) cacheCard(card);
  return json;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract usable image URIs from a Scryfall card, handling DFCs. */
export function getCardImages(card: ScryfallCard): {
  small: string;
  normal: string;
  back?: string;
} {
  // Single-faced card
  if (card.image_uris) {
    return {
      small: card.image_uris.small,
      normal: card.image_uris.normal,
    };
  }

  // Double-faced card — use card_faces
  const front = card.card_faces?.[0];
  const back = card.card_faces?.[1];
  return {
    small: front?.image_uris?.small || "",
    normal: front?.image_uris?.normal || "",
    back: back?.image_uris?.normal,
  };
}
