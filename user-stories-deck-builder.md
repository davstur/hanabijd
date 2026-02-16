# User Stories — Magic Deck Builder

## Deck Builder

### 1. Open Deck Builder

**As a** player,
**I want to** navigate to the deck builder page,
**So that** I can create a custom Magic deck.

**Steps:**

1. Navigate to a Magic game lobby (create a new Magic game or visit an existing one in lobby state).
2. The lobby shows three tabs: "Prebuilt Decks", "My Decks", and "Build New".
3. Click the "Build New" tab.
4. The browser navigates to `/magic/deck-builder`.
5. The deck builder page loads with a header (Back, "Deck Builder", Save), a set selector on the left, filters, a card results area, and a deck list panel on the right.

**Acceptance Criteria:**

- The "Build New" tab navigates to `/magic/deck-builder`.
- The deck builder page loads without errors.
- The header shows "Back", "Deck Builder", and "Save" controls.
- The set selector is visible and begins loading expansion sets from Scryfall.

---

### 2. Browse Sets

**As a** player,
**I want to** browse Magic expansions and select one,
**So that** I can view cards from a specific set.

**Steps:**

1. On the deck builder page, the set selector shows a scrollable list of playable sets (core, expansion, masters, draft_innovation).
2. Sets are sorted by release date (newest first) and show the set name with release year.
3. Type in the "Filter sets..." input to narrow the list (e.g., typing "Dominaria" filters to matching sets).
4. Click a set to select it — it highlights with a distinct background color.
5. The card results area begins loading cards from the selected set.

**Acceptance Criteria:**

- Sets load from the Scryfall API and display in descending release order.
- The filter input narrows the list by set name (case-insensitive).
- Clicking a set highlights it and triggers a card search.
- Only playable set types appear (no tokens, promo, etc.).

---

### 3. Filter Cards

**As a** player,
**I want to** filter cards within a set by name, color, and mana cost,
**So that** I can find specific cards quickly.

**Steps:**

1. Select a set in the set selector.
2. In the filters area:
   - Type a card name in the "Search cards..." input — results update after a 300ms debounce.
   - Click one or more WUBRG color buttons to filter by color — active colors show a gold border; clicking again deselects.
   - Click a CMC button (Any, 0–7+) to filter by converted mana cost.
3. The card results grid updates to show only matching cards.

**Acceptance Criteria:**

- Name search is debounced (results don't update on every keystroke).
- Color buttons toggle on/off independently and can be combined.
- CMC filter selects exactly one value at a time; "Any" clears the CMC filter.
- All three filters can be combined (e.g., red cards named "bolt" with CMC 1).

---

### 4. Add Cards to Deck

**As a** player,
**I want to** tap a card in the results to add it to my deck,
**So that** I can build my deck by browsing and selecting cards.

**Steps:**

1. With cards displayed in the results grid, tap/click a card image.
2. The card is added to the deck list on the right with a count of 1.
3. Tapping the same card again increments its count.
4. The deck list shows the card name, count, and +/- buttons for adjustment.
5. The total card count updates at the top of the deck list.

**Acceptance Criteria:**

- Single-tapping a card adds 1 copy to the deck list.
- If the card is already in the deck, its count increments.
- The deck list total count reflects all cards.
- Double-tapping a card opens a full-size zoom overlay (via MagicCardZoom) instead of adding.

---

### 5. Manage Deck List

**As a** player,
**I want to** adjust card counts and remove cards from my deck,
**So that** I can fine-tune my deck composition.

**Steps:**

1. In the deck list panel, each entry shows: a "-" button, the count, a "+" button, the card name, and an "x" (remove) button.
2. Click "+" to increment the count.
3. Click "-" to decrement the count. If count reaches 0, the entry is removed.
4. Click "x" to remove the entry entirely.
5. The total count and any validation warnings update immediately.

**Acceptance Criteria:**

- "+" increments the count by 1.
- "-" decrements the count by 1; at 0 the entry disappears.
- "x" removes the entry regardless of count.
- The total card count is always accurate.

---

### 6. Deck Validation

**As a** player,
**I want to** see warnings about my deck's legality,
**So that** I can build a valid 60-card deck.

**Steps:**

1. While building the deck, the deck list panel shows validation warnings:
   - If total cards < 60: "X/60 cards — minimum 60 recommended".
   - If any non-basic-land card has > 4 copies: "CardName: X copies (max 4)".
2. Basic lands (Plains, Island, Swamp, Mountain, Forest) are exempt from the 4-copy limit.
3. When the deck reaches 60+ cards with no violations, a green "Ready" indicator appears.

**Acceptance Criteria:**

- The under-60 warning shows the current count.
- Over-4-copy warnings appear for each offending card (not basic lands).
- Basic lands can have unlimited copies without triggering a warning.
- "Ready" indicator appears at 60+ cards with no violations.

---

### 7. Save a Deck

**As a** player,
**I want to** save my deck to Firebase,
**So that** I can reuse it in future games.

**Steps:**

1. Enter a deck name in the text input at the top of the deck list panel.
2. Click the "Save" button in the header.
3. The deck is saved to Firebase at `/magic-decks/{playerName}/{deckId}`.
4. After saving, the browser navigates back (to the game lobby or previous page).

**Acceptance Criteria:**

- Saving without a name shows an alert: "Enter a deck name."
- Saving with no cards shows an alert: "Add some cards to your deck first."
- Saving without a player name (no localStorage name) shows an alert.
- On success, the deck is persisted in Firebase and the user is navigated back.

---

### 8. View My Decks in Lobby

**As a** player,
**I want to** see my saved decks in the game lobby,
**So that** I can select a previously built deck for a game.

**Steps:**

1. Navigate to a Magic game lobby.
2. Click the "My Decks" tab.
3. The tab loads saved decks from Firebase for the current player.
4. Each deck shows its name and total card count.
5. Click a deck to select it — the cards are resolved from Scryfall and the game proceeds.

**Acceptance Criteria:**

- Saved decks are listed with name and card count.
- Decks are sorted by most recently updated first.
- If no decks exist, a message says "No saved decks yet. Use Build New to create one."
- Clicking a deck resolves card data from Scryfall and calls `onSelectDeck`.

---

### 9. Delete a Saved Deck

**As a** player,
**I want to** delete a saved deck from the lobby,
**So that** I can remove decks I no longer want.

**Steps:**

1. In the "My Decks" tab of the lobby, each deck has a small "x" delete button.
2. Click the delete button on a deck.
3. The deck is removed from Firebase and disappears from the list.

**Acceptance Criteria:**

- The delete button is visible on each saved deck entry.
- Clicking delete removes the deck from Firebase immediately.
- The deck disappears from the list without a page refresh.

---

### 10. Mobile Deck Builder

**As a** mobile player,
**I want to** use the deck builder on a small screen,
**So that** I can build decks from my phone.

**Steps:**

1. On a mobile viewport, the deck list sidebar is hidden.
2. A floating "Deck (N)" badge appears in the bottom-right corner showing the total card count.
3. Tapping the badge opens a bottom sheet with the full deck list (name input, entries with +/- buttons, validation warnings).
4. Tapping the "x" button on the bottom sheet closes it.
5. Cards can still be tapped in the results to add them — the badge count updates immediately.

**Acceptance Criteria:**

- The deck list sidebar is hidden on small screens.
- The floating badge shows the current total card count.
- The bottom sheet shows the full deck list with all controls.
- Adding cards from the results updates the badge count.
