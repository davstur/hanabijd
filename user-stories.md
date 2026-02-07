# User Stories

## Room & Account

### 1. Create a Room

**As a** player,
**I want to** create a new room,
**So that** I can invite friends to play games together.

**Steps:**

1. Navigate to the home page (`/`).
2. If a stored name exists in localStorage, it auto-fills. If not, clicking "Create a room" prompts for a player name first.
3. Enter a name (if prompted) and confirm.
4. Click "Create a room".
5. A room is created in Firebase with a human-readable ID (e.g., `AdjectiveAnimal`).
6. The user is automatically added as the first member and redirected to `/rooms/{roomId}`.

**Acceptance Criteria:**

- A new room is created in Firebase with a unique readable ID.
- The user appears in the room's member list.
- `currentRoom` and `name` are persisted in localStorage.
- On future visits to `/`, the user is auto-redirected to their stored room.

---

### 2. Join a Room

**As a** player,
**I want to** join an existing room by entering its code,
**So that** I can play games with the room's members.

**Steps:**

1. Navigate to the home page (`/`).
2. Enter the room code in the "Room code" text input.
3. If no stored name exists, the user is prompted to enter a player name first.
4. Click "Join a room".
5. The app validates the code: if empty, shows "Please enter a room code"; if the room doesn't exist, shows "Room not found".
6. On success, the user is added as a room member and redirected to `/rooms/{roomId}`.

**Acceptance Criteria:**

- Submitting an empty code shows an inline error message.
- Submitting a code for a nonexistent room shows "Room not found".
- On success, the user appears in the room's member list.
- `currentRoom` and `name` are persisted in localStorage.

---

### 3. Leave a Room

**As a** room member,
**I want to** leave the room,
**So that** I am no longer listed as a member.

**Steps:**

1. From the room page (`/rooms/{roomId}`), click the "Leave room" button in the top-right area.
2. The user is removed from the room's member list in Firebase.
3. `currentRoom` is cleared from localStorage.
4. The user is redirected to the home page (`/`).

**Acceptance Criteria:**

- The user no longer appears in the room's member list.
- `currentRoom` is removed from localStorage.
- The user lands on the home page.

---

### 4. Set Name

**As a** new visitor,
**I want to** set my player name when first creating or joining a room,
**So that** other players can identify me.

**Steps:**

1. Click "Create a room" or "Join a room" without a stored name.
2. The home page switches to a name entry form with "Choose your player name" prompt.
3. Enter a name and click "OK".
4. The original action (create or join) proceeds automatically.

**Acceptance Criteria:**

- The name prompt appears only when no name is stored in localStorage.
- The "OK" button is disabled while the name field is empty.
- Once set, the name is stored in localStorage under the `name` key and auto-fills on future visits.

---

### 5. Logout

**As a** player,
**I want to** log out and clear my session,
**So that** I can start fresh or switch identities.

**Steps:**

1. From any page (except the home page), the AppHeader is visible at the top.
2. Click the "Logout" button in the header.
3. All localStorage keys are cleared: `name`, `currentRoom`, `playerId`, `gameId`.
4. The user is redirected to the home page (`/`).

**Acceptance Criteria:**

- The AppHeader is hidden on the home page and when no name/room is stored.
- After logout, all four localStorage keys (`name`, `currentRoom`, `playerId`, `gameId`) are removed.
- The user is redirected to `/`.
- The next visit to `/` does not auto-redirect to a room.

---

### 6. Change Language

**As a** player,
**I want to** switch the app's display language,
**So that** I can use the app in my preferred language.

**Steps:**

1. On the home page, the language dropdown appears in the top-right corner. On other pages, it appears in the AppHeader.
2. Open the dropdown and select a language from the 10 available options: English, Fran&ccedil;ais, Espa&ntilde;ol, Italiano, Dutch, Russian, Portugu&ecirc;s, Deutsch, Sloven&ccaron;ina, &#31616;&#20307;&#20013;&#25991;.
3. The page re-renders instantly in the selected language via i18next.
4. Selecting the "Contribute" option opens the upstream GitHub issue page in a new tab.

**Acceptance Criteria:**

- The language selector is accessible on every page.
- Selecting a language instantly updates all translatable text.
- The "Contribute" option opens `https://github.com/bstnfrmry/hanabi/issues/180` in a new tab without changing the current language.

---

### 7. Change Notification Setting

**As a** room member,
**I want to** enable push notifications,
**So that** I am alerted when it's my turn.

**Steps:**

1. On the room page (`/rooms/{roomId}`), a notification toggle switch appears next to the "Leave room" button (only if the browser supports push notifications).
2. Click the toggle to enable notifications.
3. The browser prompts for notification permission.
4. On approval, a push subscription is registered via the service worker.
5. The toggle turns green to indicate notifications are enabled.

**Acceptance Criteria:**

- The toggle is hidden if the browser does not support push notifications (`isPushSupported()` returns false).
- Clicking the toggle when notifications are already enabled has no effect.
- The toggle visually reflects the current state (green = enabled, dim = disabled).

---

## Game Lifecycle

### 8. Create a Game

**As a** room member,
**I want to** create a new game with custom settings,
**So that** I can start a game session with my preferred rules.

**Steps:**

1. From the room page, click "New game".
2. Navigate to the game creation form (`/new-game?room={roomId}`).
3. Configure the game:
   - **Players**: Select 2, 3, 4, or 5.
   - **Variant**: Choose from Classic, Multicolor, Rainbow, Critical Rainbow, Orange, or Sequence. A description of the selected variant is shown.
   - **Advanced Options** (expandable): Pass & Play mode, Color Blind mode, Seed, Allow Rollback, Prevent Loss, Hints level (show/hide), Bots speed.
4. Click "New game" to create.
5. The game is saved to Firebase, added to the room's game list, and the current configuration is saved as the room's `lastGameConfig`.
6. The user is redirected to `/games/{gameId}` where the game lobby is displayed.

**Acceptance Criteria:**

- The form pre-fills settings from the room's last game config (if available).
- A "Back" button returns to the room page.
- The "New game" button is disabled while the game is being created.
- The game appears in the room's game list immediately.
- The game ID is human-readable (e.g., `AdjectiveAnimalColor-0`).

---

### 9. See Games

**As a** room member,
**I want to** see all games in my room with their current status,
**So that** I can find games to join, watch, or review.

**Steps:**

1. On the room page (`/rooms/{roomId}`), a "Games" section lists all games in the room.
2. Each game entry shows:
   - Player names (or "..." if no players have joined yet).
   - A status badge: **Waiting** (yellow, shows joined/needed count), **In Progress** (green, shows current score / max score), or **Finished** (lavender, shows final score / max score).
   - The game variant name.
3. Each entry has an action button: "Join" (for lobby games), "Rejoin" or "Watch" (for ongoing games, depending on membership), "View" (for finished games).
4. The list updates in real time via Firebase subscriptions.

**Acceptance Criteria:**

- The list is empty with "No games yet. Create one!" when no games exist.
- Status badges accurately reflect game state (lobby, ongoing, over).
- Ongoing games show "Rejoin" if the user is a player, "Watch" otherwise.
- Clicking any game entry navigates to `/games/{gameId}`.

---

### 10. Join a Game

**As a** player,
**I want to** join a game in the lobby,
**So that** I can participate when it starts.

**Steps:**

1. Navigate to a game that is in the lobby state (via the room's game list or a direct link).
2. The lobby screen shows the game's join status (e.g., "1/3 players").
3. If a stored name exists in localStorage, the player is auto-joined immediately.
4. If no stored name exists, enter a name in the "Choose your player name" field and click "Join".
5. While waiting for others, a shareable link is displayed with a "Copy" button.
6. Optionally, click "Add AI" to fill a slot with a bot player (named "AI #1", "AI #2", etc.).
7. When all player slots are filled, the "Start game" button becomes available. Click it to begin.

**Acceptance Criteria:**

- Players with a stored name are auto-joined without interaction.
- The "Join" button is disabled when the name field is empty.
- The share link follows the format `{host}/games/{gameId}`.
- The "Add AI" option is available only when the current player has joined and slots remain.
- The "Start game" button appears only when all slots are filled.
- In Pass & Play mode, the same device user can join multiple slots by entering different names.

---

### 11. Watch a Game

**As a** spectator,
**I want to** watch an ongoing game I'm not part of,
**So that** I can follow the action without interfering.

**Steps:**

1. From the room's game list, find an ongoing game where you are not a player.
2. Click the "Watch" button on the game entry.
3. Navigate to `/games/{gameId}`.
4. The game view loads with all players' cards visible (spectator perspective).
5. The game state updates in real time. No action buttons (play, discard, hint) are shown.

**Acceptance Criteria:**

- The "Watch" button appears only for ongoing games where the user is not a player.
- The spectator can see all cards and game progress in real time.
- No game actions (play, discard, hint) are available to spectators.

---

### 12. Rejoin a Game

**As a** player who left mid-game,
**I want to** rejoin an ongoing game I'm part of,
**So that** I can resume playing from where I left off.

**Steps:**

1. From the room's game list, find an ongoing game where you are already a player.
2. Click the "Rejoin" button on the game entry.
3. Navigate to `/games/{gameId}`.
4. The game view loads with real-time sync. The full game state is reconstructed from the turns history.
5. If it is your turn, action buttons are available to play, discard, or give a hint.

**Acceptance Criteria:**

- The "Rejoin" button appears only for ongoing games where the user is an existing player.
- The game state is fully reconstructed including all past turns.
- The player can immediately take actions if it is their turn.
- Real-time sync resumes so all players see updates live.
