"""Canonical observation encoder for Hanabi, matching the DeepMind HLE format.

Produces the same flat binary vector that SAD models expect as input.
Reference: hanabi-learning-environment/hanabi_lib/canonical_encoders.cc
"""

from __future__ import annotations

from hanabi_game import (
    HAND_SIZE,
    NUM_COLORS,
    NUM_RANKS,
    CARD_COUNT_PER_RANK,
    MAX_DECK_SIZE,
    MAX_INFO_TOKENS,
    MAX_LIFE_TOKENS,
    ActionType,
    HanabiState,
)


def _encode_card(color: int, rank: int) -> list[int]:
    """One-hot encode a card as a 25-bit vector."""
    bits = [0] * (NUM_COLORS * NUM_RANKS)
    bits[color * NUM_RANKS + rank] = 1
    return bits


def _encode_hands(state: HanabiState, observer: int) -> list[int]:
    """Encode other players' hands (visible to observer).

    For each player (in relative order starting from observer+1),
    encode each card slot. Missing cards get zero-vectors.
    Then append num_players bits indicating which players have
    fewer cards than the max hand size.
    """
    bits: list[int] = []
    card_bits = NUM_COLORS * NUM_RANKS  # 25

    for offset in range(1, state.num_players):
        player = (observer + offset) % state.num_players
        hand = state.hands[player]
        for i in range(state.hand_size):
            if i < len(hand):
                bits.extend(_encode_card(hand[i].color, hand[i].rank))
            else:
                bits.extend([0] * card_bits)

    # Missing card bits: one per player indicating fewer than hand_size cards
    for offset in range(state.num_players):
        player = (observer + offset) % state.num_players
        bits.append(1 if len(state.hands[player]) < state.hand_size else 0)

    return bits


def _encode_board(state: HanabiState) -> list[int]:
    """Encode board state: fireworks, info tokens, life tokens, deck size.

    Deck thermometer uses MaxDeckSize - NumPlayers * HandSize bits,
    since dealt cards can never be in the deck.
    """
    bits: list[int] = []

    # Fireworks: thermometer encoding per color (5 colors x 5 bits)
    for c in range(NUM_COLORS):
        level = state.fireworks[c]
        for r in range(NUM_RANKS):
            bits.append(1 if r < level else 0)

    # Info tokens: thermometer (8 bits)
    for i in range(MAX_INFO_TOKENS):
        bits.append(1 if i < state.info_tokens else 0)

    # Life tokens: thermometer (3 bits)
    for i in range(MAX_LIFE_TOKENS):
        bits.append(1 if i < state.life_tokens else 0)

    # Deck size: thermometer (MaxDeckSize - NumPlayers * HandSize bits)
    max_draw_pile = MAX_DECK_SIZE - state.num_players * state.hand_size
    deck_len = len(state.deck)
    for i in range(max_draw_pile):
        bits.append(1 if i < deck_len else 0)

    return bits


def _encode_discards(state: HanabiState) -> list[int]:
    """Encode discard pile using count-based encoding.

    For each (color, rank) pair, encode how many copies have been discarded
    using thermometer coding up to the max count for that rank.
    """
    bits: list[int] = []

    # Count discards per (color, rank)
    counts = [[0] * NUM_RANKS for _ in range(NUM_COLORS)]
    for card in state.discard_pile:
        counts[card.color][card.rank] += 1

    for c in range(NUM_COLORS):
        for r in range(NUM_RANKS):
            max_count = CARD_COUNT_PER_RANK[r]
            count = counts[c][r]
            for i in range(max_count):
                bits.append(1 if i < count else 0)

    return bits


def _encode_last_action(state: HanabiState, observer: int) -> list[int]:
    """Encode the last action taken, from the perspective of observer.

    Sub-fields (matching HLE canonical_encoders.cc):
      1. Acting player (num_players one-hot, relative to observer)
      2. Action type (4 one-hot: PLAY, DISCARD, REVEAL_COLOR, REVEAL_RANK)
      3. Target player (num_players one-hot, for hints)
      4. Color revealed (NUM_COLORS one-hot, for color hints only)
      5. Rank revealed (NUM_RANKS one-hot, for rank hints only)
      6. Outcome / cards revealed (hand_size bitmask, for hints)
      7. Position played/discarded (hand_size one-hot, for play/discard)
      8. Card identity (25-bit one-hot, for play/discard)
      9. Scored + info_added (2 bits)
    """
    card_bits = NUM_COLORS * NUM_RANKS  # 25

    if state.last_action is None:
        total_bits = _last_action_size(state.num_players)
        return [0] * total_bits

    la = state.last_action
    bits: list[int] = []

    # 1. Acting player: one-hot relative to observer
    acting_offset = (la.player - observer) % state.num_players
    for i in range(state.num_players):
        bits.append(1 if i == acting_offset else 0)

    # 2. Action type: one-hot (HLE order: PLAY, DISCARD, REVEAL_COLOR, REVEAL_RANK)
    for t in [ActionType.PLAY, ActionType.DISCARD, ActionType.REVEAL_COLOR, ActionType.REVEAL_RANK]:
        bits.append(1 if la.action_type == t else 0)

    # 3. Target player: one-hot relative to observer (for hints only)
    if la.action_type in (ActionType.REVEAL_COLOR, ActionType.REVEAL_RANK):
        target_offset = (la.target_player - observer) % state.num_players
        for i in range(state.num_players):
            bits.append(1 if i == target_offset else 0)
    else:
        bits.extend([0] * state.num_players)

    # 4. Color revealed: one-hot (only for REVEAL_COLOR)
    if la.action_type == ActionType.REVEAL_COLOR:
        for c in range(NUM_COLORS):
            bits.append(1 if c == la.color else 0)
    else:
        bits.extend([0] * NUM_COLORS)

    # 5. Rank revealed: one-hot (only for REVEAL_RANK)
    if la.action_type == ActionType.REVEAL_RANK:
        for r in range(NUM_RANKS):
            bits.append(1 if r == la.rank else 0)
    else:
        bits.extend([0] * NUM_RANKS)

    # 6. Outcome / cards revealed by hint: bitmask (hand_size, for hints)
    if la.action_type in (ActionType.REVEAL_COLOR, ActionType.REVEAL_RANK):
        for i in range(state.hand_size):
            bits.append(1 if i < len(la.cards_revealed) and la.cards_revealed[i] else 0)
    else:
        bits.extend([0] * state.hand_size)

    # 7. Position played/discarded: one-hot (hand_size, for play/discard)
    if la.action_type in (ActionType.PLAY, ActionType.DISCARD):
        for i in range(state.hand_size):
            bits.append(1 if i == la.card_index else 0)
    else:
        bits.extend([0] * state.hand_size)

    # 8. Card identity: 25-bit one-hot (for play/discard)
    if la.action_type in (ActionType.PLAY, ActionType.DISCARD) and la.card_color >= 0 and la.card_rank >= 0:
        bits.extend(_encode_card(la.card_color, la.card_rank))
    else:
        bits.extend([0] * card_bits)

    # 9. Play scored / info added
    bits.append(1 if la.scored else 0)
    bits.append(1 if la.info_added else 0)

    return bits


def _last_action_size(num_players: int) -> int:
    """Size of last action encoding."""
    hs = 5 if num_players <= 3 else 4
    card_bits = NUM_COLORS * NUM_RANKS  # 25
    return (
        num_players    # acting player
        + 4            # action type
        + num_players  # target player
        + NUM_COLORS   # color revealed
        + NUM_RANKS    # rank revealed
        + hs           # outcome / cards revealed
        + hs           # position played/discarded
        + card_bits    # card identity (25 bits)
        + 2            # scored + info_added
    )


def _encode_card_knowledge(state: HanabiState, observer: int) -> list[int]:
    """Encode card knowledge for all players from observer's perspective.

    For each card slot of each player (starting with observer), encode:
    - 25 bits: which (color, rank) possibilities remain
    - 5 bits: which colors are plausible
    - 5 bits: which ranks are plausible
    Total: 35 bits per card slot
    """
    bits: list[int] = []

    for offset in range(state.num_players):
        player = (observer + offset) % state.num_players
        knowledge = state.knowledge[player]
        for i in range(state.hand_size):
            if i < len(knowledge):
                k = knowledge[i]
                # Possibility matrix: 25 bits
                for c in range(NUM_COLORS):
                    for r in range(NUM_RANKS):
                        bits.append(1 if k.color_plausible[c] and k.rank_plausible[r] else 0)
                # Color hints
                for c in range(NUM_COLORS):
                    bits.append(1 if k.color_plausible[c] else 0)
                # Rank hints
                for r in range(NUM_RANKS):
                    bits.append(1 if k.rank_plausible[r] else 0)
            else:
                bits.extend([0] * 35)

    return bits


def _encode_own_hand(state: HanabiState, observer: int) -> list[int]:
    """Encode observer's own hand (private info, for V0 training features)."""
    bits: list[int] = []
    hand = state.hands[observer]
    for i in range(state.hand_size):
        if i < len(hand):
            bits.extend(_encode_card(hand[i].color, hand[i].rank))
        else:
            bits.extend([0] * (NUM_COLORS * NUM_RANKS))
    return bits


def encode_observation(state: HanabiState, observer: int, include_own_hand: bool = True) -> list[int]:
    """Build the full canonical observation vector for the given observer.

    The order matches the HLE canonical encoder:
    1. Other players' hands + missing card indicators
    2. Board (fireworks, tokens, deck)
    3. Discards
    4. Last action
    5. Card knowledge (all players)
    6. (Optional) Own hand for training
    """
    obs: list[int] = []
    obs.extend(_encode_hands(state, observer))
    obs.extend(_encode_board(state))
    obs.extend(_encode_discards(state))
    obs.extend(_encode_last_action(state, observer))
    obs.extend(_encode_card_knowledge(state, observer))
    if include_own_hand:
        obs.extend(_encode_own_hand(state, observer))
    return obs


def observation_size(num_players: int, include_own_hand: bool = True) -> int:
    """Compute expected observation vector size."""
    hs = 5 if num_players <= 3 else 4
    card_bits = NUM_COLORS * NUM_RANKS  # 25

    hands = (num_players - 1) * hs * card_bits + num_players
    board = NUM_COLORS * NUM_RANKS + MAX_INFO_TOKENS + MAX_LIFE_TOKENS + (MAX_DECK_SIZE - num_players * hs)
    discards = sum(CARD_COUNT_PER_RANK) * NUM_COLORS
    last_action = _last_action_size(num_players)
    knowledge = num_players * hs * 35
    own_hand = hs * card_bits if include_own_hand else 0

    return hands + board + discards + last_action + knowledge + own_hand
