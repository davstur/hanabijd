"""Pure Python Hanabi game environment.

Mirrors the DeepMind Hanabi Learning Environment enough to produce
canonical observations and step through games, without requiring
the C++ HLE build.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NUM_COLORS = 5
NUM_RANKS = 5
HAND_SIZE = {2: 5, 3: 5, 4: 4, 5: 4}
MAX_INFO_TOKENS = 8
MAX_LIFE_TOKENS = 3
MAX_DECK_SIZE = 50  # for 5-color classic
CARD_COUNT_PER_RANK = [3, 2, 2, 2, 1]  # rank 0..4 -> count


class ActionType(IntEnum):
    DISCARD = 0
    PLAY = 1
    REVEAL_COLOR = 2
    REVEAL_RANK = 3


@dataclass
class Card:
    color: int  # 0..4
    rank: int   # 0..4

    def __repr__(self) -> str:
        colors = "RGBWY"
        return f"{colors[self.color]}{self.rank + 1}"


@dataclass
class Action:
    type: ActionType
    card_index: int = 0       # for PLAY / DISCARD
    target_offset: int = 0    # for REVEAL_* (1 = next player, etc.)
    color: int = 0            # for REVEAL_COLOR
    rank: int = 0             # for REVEAL_RANK

    def to_action_id(self, num_players: int) -> int:
        """Convert to flat action index matching HLE convention."""
        if self.type == ActionType.DISCARD:
            return self.card_index
        elif self.type == ActionType.PLAY:
            return 5 + self.card_index
        elif self.type == ActionType.REVEAL_COLOR:
            return 10 + (self.target_offset - 1) * NUM_COLORS + self.color
        elif self.type == ActionType.REVEAL_RANK:
            base = 10 + (num_players - 1) * NUM_COLORS
            return base + (self.target_offset - 1) * NUM_RANKS + self.rank
        raise ValueError(f"Unknown action type: {self.type}")


def action_from_id(action_id: int, num_players: int, hand_size: int) -> Action:
    """Convert flat action index back to structured Action."""
    if action_id < hand_size:
        return Action(type=ActionType.DISCARD, card_index=action_id)
    offset = hand_size
    if action_id < offset + hand_size:
        return Action(type=ActionType.PLAY, card_index=action_id - offset)
    offset += hand_size
    num_color_hints = (num_players - 1) * NUM_COLORS
    if action_id < offset + num_color_hints:
        idx = action_id - offset
        target = idx // NUM_COLORS + 1
        color = idx % NUM_COLORS
        return Action(type=ActionType.REVEAL_COLOR, target_offset=target, color=color)
    offset += num_color_hints
    idx = action_id - offset
    target = idx // NUM_RANKS + 1
    rank = idx % NUM_RANKS
    return Action(type=ActionType.REVEAL_RANK, target_offset=target, rank=rank)


def num_actions(num_players: int) -> int:
    """Total number of discrete actions for this player count."""
    hand_size = HAND_SIZE[num_players]
    return hand_size + hand_size + (num_players - 1) * NUM_COLORS + (num_players - 1) * NUM_RANKS


@dataclass
class CardKnowledge:
    """What a player knows about one of their cards."""
    color_plausible: list[bool] = field(default_factory=lambda: [True] * NUM_COLORS)
    rank_plausible: list[bool] = field(default_factory=lambda: [True] * NUM_RANKS)
    color_hinted: bool = False
    rank_hinted: bool = False
    known_color: int = -1
    known_rank: int = -1


@dataclass
class LastAction:
    """Records the last action taken for observation encoding."""
    player: int = -1
    action_type: ActionType = ActionType.DISCARD
    card_index: int = 0
    color: int = 0
    rank: int = 0
    target_player: int = -1     # absolute index
    scored: bool = False        # play succeeded
    info_added: bool = False    # play of 5 recovered hint token
    card_color: int = -1        # revealed card color for play/discard
    card_rank: int = -1         # revealed card rank for play/discard
    cards_revealed: list[bool] = field(default_factory=lambda: [False] * 5)


@dataclass
class HanabiState:
    """Full Hanabi game state."""
    num_players: int
    hand_size: int
    deck: list[Card]
    hands: list[list[Card]]                # hands[player][card_idx]
    knowledge: list[list[CardKnowledge]]   # knowledge[player][card_idx]
    fireworks: list[int]                   # fireworks[color] = highest played rank + 1 (0-5)
    info_tokens: int
    life_tokens: int
    discard_pile: list[Card]
    current_player: int
    turns_since_last_draw: int             # -1 = not triggered, 0..num_players
    score: int
    game_over: bool
    last_action: Optional[LastAction]

    @property
    def max_score(self) -> int:
        return NUM_COLORS * NUM_RANKS

    def legal_actions(self) -> list[int]:
        """Return list of legal action IDs for current player."""
        actions = []
        hs = self.hand_size
        n = self.num_players
        hand_len = len(self.hands[self.current_player])

        # Discards (only if info tokens < max)
        if self.info_tokens < MAX_INFO_TOKENS:
            for i in range(hand_len):
                actions.append(i)  # DISCARD card i

        # Plays (always legal)
        for i in range(hand_len):
            actions.append(hs + i)  # PLAY card i

        # Hints (only if info tokens > 0)
        if self.info_tokens > 0:
            base_color = hs + hs
            base_rank = base_color + (n - 1) * NUM_COLORS
            for offset in range(1, n):
                target = (self.current_player + offset) % n
                target_hand = self.hands[target]
                colors_present = set(c.color for c in target_hand)
                ranks_present = set(c.rank for c in target_hand)
                for c in range(NUM_COLORS):
                    if c in colors_present:
                        actions.append(base_color + (offset - 1) * NUM_COLORS + c)
                for r in range(NUM_RANKS):
                    if r in ranks_present:
                        actions.append(base_rank + (offset - 1) * NUM_RANKS + r)

        return sorted(actions)

    def legal_action_mask(self) -> list[bool]:
        """Return boolean mask of size num_actions."""
        total = num_actions(self.num_players)
        mask = [False] * total
        for a in self.legal_actions():
            mask[a] = True
        return mask

    def apply_action(self, action_id: int) -> None:
        """Apply action in-place, mutating this state."""
        action = action_from_id(action_id, self.num_players, self.hand_size)
        cp = self.current_player
        self.last_action = LastAction(player=cp)
        la = self.last_action

        if action.type == ActionType.DISCARD:
            la.action_type = ActionType.DISCARD
            la.card_index = action.card_index
            card = self.hands[cp].pop(action.card_index)
            self.knowledge[cp].pop(action.card_index)
            la.card_color = card.color
            la.card_rank = card.rank
            self.discard_pile.append(card)
            self.info_tokens = min(self.info_tokens + 1, MAX_INFO_TOKENS)
            self._draw(cp)

        elif action.type == ActionType.PLAY:
            la.action_type = ActionType.PLAY
            la.card_index = action.card_index
            card = self.hands[cp].pop(action.card_index)
            self.knowledge[cp].pop(action.card_index)
            la.card_color = card.color
            la.card_rank = card.rank

            if card.rank == self.fireworks[card.color]:
                # Successful play
                self.fireworks[card.color] += 1
                self.score += 1
                la.scored = True
                if card.rank == 4:  # completed a stack
                    self.info_tokens = min(self.info_tokens + 1, MAX_INFO_TOKENS)
                    la.info_added = True
            else:
                # Failed play
                self.discard_pile.append(card)
                self.life_tokens -= 1
                la.scored = False
                if self.life_tokens <= 0:
                    self.game_over = True
                    self.score = 0
                    return

            self._draw(cp)

        elif action.type == ActionType.REVEAL_COLOR:
            la.action_type = ActionType.REVEAL_COLOR
            la.color = action.color
            target = (cp + action.target_offset) % self.num_players
            la.target_player = target
            la.cards_revealed = [False] * self.hand_size
            for i, card in enumerate(self.hands[target]):
                if card.color == action.color:
                    la.cards_revealed[i] = True
                    self.knowledge[target][i].color_plausible = [False] * NUM_COLORS
                    self.knowledge[target][i].color_plausible[action.color] = True
                    self.knowledge[target][i].color_hinted = True
                    self.knowledge[target][i].known_color = action.color
                else:
                    self.knowledge[target][i].color_plausible[action.color] = False
            self.info_tokens -= 1

        elif action.type == ActionType.REVEAL_RANK:
            la.action_type = ActionType.REVEAL_RANK
            la.rank = action.rank
            target = (cp + action.target_offset) % self.num_players
            la.target_player = target
            la.cards_revealed = [False] * self.hand_size
            for i, card in enumerate(self.hands[target]):
                if card.rank == action.rank:
                    la.cards_revealed[i] = True
                    self.knowledge[target][i].rank_plausible = [False] * NUM_RANKS
                    self.knowledge[target][i].rank_plausible[action.rank] = True
                    self.knowledge[target][i].rank_hinted = True
                    self.knowledge[target][i].known_rank = action.rank
                else:
                    self.knowledge[target][i].rank_plausible[action.rank] = False
            self.info_tokens -= 1

        # Check end-of-game conditions
        if self.score == self.max_score:
            self.game_over = True
            return

        if self.turns_since_last_draw >= 0:
            self.turns_since_last_draw += 1
            if self.turns_since_last_draw >= self.num_players:
                self.game_over = True
                return

        # Advance current player
        self.current_player = (cp + 1) % self.num_players

    def _draw(self, player: int) -> None:
        """Draw a card from the deck for the given player."""
        if self.deck:
            card = self.deck.pop()
            self.hands[player].append(card)
            self.knowledge[player].append(CardKnowledge())
        else:
            if self.turns_since_last_draw < 0:
                self.turns_since_last_draw = 0

    def clone(self) -> HanabiState:
        return copy.deepcopy(self)


def create_game(num_players: int, deck: list[Card]) -> HanabiState:
    """Create a new game with the given deck (top of deck = index -1)."""
    hs = HAND_SIZE[num_players]
    hands: list[list[Card]] = [[] for _ in range(num_players)]
    knowledge: list[list[CardKnowledge]] = [[] for _ in range(num_players)]

    remaining_deck = list(deck)  # copy

    # Deal cards
    for _ in range(hs):
        for p in range(num_players):
            if remaining_deck:
                card = remaining_deck.pop()
                hands[p].append(card)
                knowledge[p].append(CardKnowledge())

    return HanabiState(
        num_players=num_players,
        hand_size=hs,
        deck=remaining_deck,
        hands=hands,
        knowledge=knowledge,
        fireworks=[0] * NUM_COLORS,
        info_tokens=MAX_INFO_TOKENS,
        life_tokens=MAX_LIFE_TOKENS,
        discard_pile=[],
        current_player=0,
        turns_since_last_draw=-1,
        score=0,
        game_over=False,
        last_action=None,
    )
