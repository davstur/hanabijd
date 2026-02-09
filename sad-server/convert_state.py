"""Convert hanab.cards JSON game state to the internal HanabiState representation.

This module bridges the web app's game state format (IGameState from the
TypeScript codebase) to our pure-Python HanabiState, enabling SAD model
inference on live games.
"""

from __future__ import annotations

from hanabi_game import (
    NUM_COLORS,
    NUM_RANKS,
    HAND_SIZE,
    MAX_INFO_TOKENS,
    MAX_LIFE_TOKENS,
    ActionType,
    Card,
    CardKnowledge,
    HanabiState,
    LastAction,
    num_actions,
)

# Map web app color strings to HLE color indices (RGBWY order)
COLOR_MAP = {
    "red": 0,
    "green": 1,
    "blue": 2,
    "white": 3,
    "yellow": 4,
}

# Reverse map
COLOR_NAMES = {v: k for k, v in COLOR_MAP.items()}


def _convert_card(card_json: dict) -> Card:
    """Convert a JSON card {color, number} to our Card."""
    return Card(
        color=COLOR_MAP[card_json["color"]],
        rank=card_json["number"] - 1,  # 1-indexed -> 0-indexed
    )


def _convert_hint(hint_json: dict | None) -> CardKnowledge:
    """Convert ICardHint JSON to our CardKnowledge.

    ICardHint format:
    {
        color: { red: 0|1|2, green: 0|1|2, ... },  // 0=impossible, 1=possible, 2=sure
        number: { 1: 0|1|2, 2: 0|1|2, ... }
    }
    """
    k = CardKnowledge()
    if hint_json is None:
        return k

    color_hints = hint_json.get("color", {})
    for color_name, idx in COLOR_MAP.items():
        level = color_hints.get(color_name, 1)
        if level == 0:  # IMPOSSIBLE
            k.color_plausible[idx] = False
        elif level == 2:  # SURE
            k.color_plausible = [False] * NUM_COLORS
            k.color_plausible[idx] = True
            k.color_hinted = True
            k.known_color = idx

    number_hints = hint_json.get("number", {})
    for num_str, level in number_hints.items():
        rank = int(num_str) - 1  # 1-indexed -> 0-indexed
        if 0 <= rank < NUM_RANKS:
            if level == 0:  # IMPOSSIBLE
                k.rank_plausible[rank] = False
            elif level == 2:  # SURE
                k.rank_plausible = [False] * NUM_RANKS
                k.rank_plausible[rank] = True
                k.rank_hinted = True
                k.known_rank = rank

    return k


def _convert_last_action(
    turn_json: dict | None,
    num_players: int,
) -> LastAction | None:
    """Convert last turn from turnsHistory to LastAction."""
    if turn_json is None:
        return None

    action_json = turn_json.get("action", {})
    action_type_str = action_json.get("action", "")

    la = LastAction()
    la.player = action_json.get("from", 0)

    if action_type_str == "discard":
        la.action_type = ActionType.DISCARD
        la.card_index = action_json.get("cardIndex", 0)
        card = action_json.get("card")
        if card:
            la.card_color = COLOR_MAP.get(card["color"], 0)
            la.card_rank = card["number"] - 1

    elif action_type_str == "play":
        la.action_type = ActionType.PLAY
        la.card_index = action_json.get("cardIndex", 0)
        card = action_json.get("card")
        if card:
            la.card_color = COLOR_MAP.get(card["color"], 0)
            la.card_rank = card["number"] - 1
        la.scored = not turn_json.get("failed", False)
        # info_added is true when playing a 5 successfully
        if la.scored and card and card["number"] == 5:
            la.info_added = True

    elif action_type_str == "hint":
        hint_type = action_json.get("type", "")
        la.target_player = action_json.get("to", 0)
        cards_index = action_json.get("cardsIndex", [])

        if hint_type == "color":
            la.action_type = ActionType.REVEAL_COLOR
            la.color = COLOR_MAP.get(action_json.get("value", "red"), 0)
        elif hint_type == "number":
            la.action_type = ActionType.REVEAL_RANK
            la.rank = int(action_json.get("value", 1)) - 1

        hs = HAND_SIZE[num_players]
        la.cards_revealed = [False] * hs
        for idx in cards_index:
            if idx < hs:
                la.cards_revealed[idx] = True

    return la


def convert_game_state(game_json: dict) -> HanabiState:
    """Convert a full JSON game state to HanabiState.

    Expected format matches the IGameState interface from the web app.
    The game must be variant "classic" with 5 colors.

    This function reconstructs the HanabiState from the high-level
    game state rather than replaying from turns history, since the
    web app provides fully materialized state.
    """
    players = game_json.get("players", [])
    num_players = len(players)
    hs = HAND_SIZE[num_players]

    # Convert hands
    hands: list[list[Card]] = []
    knowledge: list[list[CardKnowledge]] = []
    for player in players:
        hand_cards: list[Card] = []
        hand_knowledge: list[CardKnowledge] = []
        hand = player.get("hand", [])
        if hand:
            for card_json in hand:
                hand_cards.append(_convert_card(card_json))
                hand_knowledge.append(_convert_hint(card_json.get("hint")))
        hands.append(hand_cards)
        knowledge.append(hand_knowledge)

    # Fireworks from played cards
    fireworks = [0] * NUM_COLORS
    for card_json in game_json.get("playedCards", []):
        c = COLOR_MAP.get(card_json["color"])
        if c is not None:
            rank = card_json["number"] - 1
            fireworks[c] = max(fireworks[c], rank + 1)

    # Discard pile
    discard_pile = [_convert_card(c) for c in game_json.get("discardPile", [])]

    # Draw pile
    draw_pile = [_convert_card(c) for c in game_json.get("drawPile", [])]

    # Tokens
    tokens = game_json.get("tokens", {})
    info_tokens = tokens.get("hints", MAX_INFO_TOKENS)
    strikes = tokens.get("strikes", 0)
    life_tokens = MAX_LIFE_TOKENS - strikes

    # Current player
    current_player = game_json.get("currentPlayer", 0)

    # Turns since last draw
    actions_left = game_json.get("actionsLeft", num_players + 1)
    if len(draw_pile) == 0 and actions_left <= num_players:
        turns_since_last_draw = num_players - actions_left + 1
    else:
        turns_since_last_draw = -1

    # Score
    score = sum(fireworks)

    # Game over
    status = game_json.get("status", "ongoing")
    game_over = status == "over" or life_tokens <= 0 or score == NUM_COLORS * NUM_RANKS

    # Last action from turns history
    turns_history = game_json.get("turnsHistory", [])
    last_turn = turns_history[-1] if turns_history else None
    last_action = _convert_last_action(last_turn, num_players)

    return HanabiState(
        num_players=num_players,
        hand_size=hs,
        deck=draw_pile,
        hands=hands,
        knowledge=knowledge,
        fireworks=fireworks,
        info_tokens=info_tokens,
        life_tokens=life_tokens,
        discard_pile=discard_pile,
        current_player=current_player,
        turns_since_last_draw=turns_since_last_draw,
        score=score,
        game_over=game_over,
        last_action=last_action,
    )


def action_to_json(action_id: int, state: HanabiState) -> dict:
    """Convert a flat action ID back to the web app's action format."""
    from hanabi_game import action_from_id
    action = action_from_id(action_id, state.num_players, state.hand_size)
    cp = state.current_player

    if action.type == ActionType.DISCARD:
        card = state.hands[cp][action.card_index] if action.card_index < len(state.hands[cp]) else None
        result = {
            "action": "discard",
            "from": cp,
            "cardIndex": action.card_index,
        }
        if card:
            result["card"] = {"color": COLOR_NAMES[card.color], "number": card.rank + 1}
        return result

    elif action.type == ActionType.PLAY:
        card = state.hands[cp][action.card_index] if action.card_index < len(state.hands[cp]) else None
        result = {
            "action": "play",
            "from": cp,
            "cardIndex": action.card_index,
        }
        if card:
            result["card"] = {"color": COLOR_NAMES[card.color], "number": card.rank + 1}
        return result

    elif action.type == ActionType.REVEAL_COLOR:
        target = (cp + action.target_offset) % state.num_players
        color_name = COLOR_NAMES[action.color]
        matching = [
            i for i, c in enumerate(state.hands[target])
            if c.color == action.color
        ]
        return {
            "action": "hint",
            "from": cp,
            "to": target,
            "type": "color",
            "value": color_name,
            "cardsIndex": matching,
        }

    elif action.type == ActionType.REVEAL_RANK:
        target = (cp + action.target_offset) % state.num_players
        matching = [
            i for i, c in enumerate(state.hands[target])
            if c.rank == action.rank
        ]
        return {
            "action": "hint",
            "from": cp,
            "to": target,
            "type": "number",
            "value": action.rank + 1,  # 0-indexed -> 1-indexed
            "cardsIndex": matching,
        }

    return {}
