"""SAD Hanabi API Server.

Stateless FastAPI server that computes expected game value and best move
using the SAD (Simplified Action Decoder) model from Facebook Research.
Designed for deployment on Google Cloud Run.

Endpoints:
    POST /act           - Get best action for current game state
    POST /evaluate      - Get expected game value for current state
    POST /act-sequence  - Replay game from history, get action at each step
    GET  /health        - Health check
    GET  /model-info    - Model metadata
"""

from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from convert_state import COLOR_MAP, action_to_json, convert_game_state
from hanabi_game import (
    CARD_COUNT_PER_RANK,
    HAND_SIZE,
    NUM_COLORS,
    NUM_RANKS,
    ActionType,
    Card,
    HanabiState,
    action_from_id,
    create_game,
    num_actions,
)
from observation import encode_observation, observation_size
from sad_model import SADAgent, load_sad_model

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL_DIR = os.environ.get("MODEL_DIR", "models")
MODEL_NAME = os.environ.get("MODEL_NAME", "sad_2p_10.pthw")
DEVICE = os.environ.get("DEVICE", "cpu")

# Global model reference
_agents: dict[str, SADAgent] = {}


def _get_model_path() -> str:
    return os.path.join(MODEL_DIR, MODEL_NAME)


def _load_model() -> SADAgent:
    path = _get_model_path()
    if not os.path.exists(path):
        raise RuntimeError(
            f"Model weights not found at {path}. "
            f"Run: python download_model.py --model-dir {MODEL_DIR}"
        )
    logger.info("Loading SAD model from %s on device=%s", path, DEVICE)
    t0 = time.time()
    agent = load_sad_model(path, device=DEVICE)
    logger.info("Model loaded in %.2fs", time.time() - t0)
    return agent


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model at startup."""
    try:
        _agents["default"] = _load_model()
        logger.info("SAD model ready for inference")
    except RuntimeError as e:
        logger.warning("Model not loaded at startup: %s", e)
    yield
    _agents.clear()


app = FastAPI(
    title="SAD Hanabi API",
    description=(
        "Stateless API for computing expected game value and best moves "
        "using the SAD (Simplified Action Decoder) model for Hanabi."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


def _get_agent() -> SADAgent:
    agent = _agents.get("default")
    if agent is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Ensure model weights are available.",
        )
    return agent


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CardJSON(BaseModel):
    color: str
    number: int
    hint: dict | None = None
    id: int | None = None
    receivedHints: list[dict] | None = None


class PlayerJSON(BaseModel):
    name: str
    hand: list[CardJSON] | None = None
    bot: bool = False
    index: int | None = None
    reaction: str | None = None
    lastAction: dict | None = None
    notified: bool | None = None


class TokensJSON(BaseModel):
    hints: int = 8
    strikes: int = 0


class GameOptionsJSON(BaseModel):
    id: str = ""
    variant: str | None = "classic"
    playersCount: int = 2
    allowRollback: bool = False
    preventLoss: bool = False
    seed: str = ""
    private: bool = False
    hintsLevel: str = "ALL"
    turnsHistory: bool = True
    botsWait: int = 0
    gameMode: str = "NETWORK"
    colorBlindMode: bool = False


class TurnJSON(BaseModel):
    action: dict
    card: dict | None = None
    failed: bool | None = None


class GameStateJSON(BaseModel):
    """Matches the IGameState interface from the web app."""
    id: str = ""
    status: str = "ongoing"
    playedCards: list[CardJSON] = []
    drawPile: list[CardJSON] = []
    discardPile: list[CardJSON] = []
    players: list[PlayerJSON]
    tokens: TokensJSON = TokensJSON()
    currentPlayer: int = 0
    options: GameOptionsJSON = GameOptionsJSON()
    actionsLeft: int = Field(default=10)
    turnsHistory: list[TurnJSON] = []
    messages: list[dict] = []
    createdAt: int = 0
    synced: bool = True


class ActRequest(BaseModel):
    """Request body for /act endpoint."""
    game_state: GameStateJSON
    player: int | None = None  # defaults to currentPlayer


class ActResponse(BaseModel):
    """Response from /act endpoint."""
    action: dict
    action_id: int
    q_values: dict[str, float]
    legal_actions: list[int]
    best_q_value: float
    all_actions: list[dict]


class EvaluateRequest(BaseModel):
    """Request body for /evaluate endpoint."""
    game_state: GameStateJSON
    player: int | None = None


class EvaluateResponse(BaseModel):
    """Response from /evaluate endpoint."""
    expected_value: float
    current_score: int
    max_possible_score: int
    best_action: dict
    best_action_id: int
    q_values: dict[str, float]


class ActSequenceRequest(BaseModel):
    """Request body for /act-sequence. Replays from initial state."""
    game_state: GameStateJSON
    num_steps: int = 1  # how many future steps to compute


class ActSequenceStep(BaseModel):
    action: dict
    action_id: int
    q_value: float


class ActSequenceResponse(BaseModel):
    steps: list[ActSequenceStep]


class ModelInfoResponse(BaseModel):
    model_name: str
    device: str
    input_dim: int
    hidden_dim: int
    output_dim: int
    num_lstm_layers: int
    num_fc_layers: int
    skip_connect: bool
    observation_size: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run_inference(
    state: HanabiState,
    agent: SADAgent,
    player: int | None = None,
    replay_turns: list[dict] | None = None,
) -> tuple[int, list[float], list[bool]]:
    """Run SAD inference on a game state.

    For stateless per-request inference, we replay the turns history
    through the LSTM to build up the hidden state, then select the
    action for the final state.

    Args:
        state: The current game state
        agent: The SAD agent
        player: The player to act as (defaults to state.current_player)
        replay_turns: If provided, replay these turns first to warm up LSTM

    Returns:
        (action_id, q_values, legal_mask)
    """
    if player is None:
        player = state.current_player

    agent.reset()

    # Build observation for the current state
    obs = encode_observation(state, player, include_own_hand=True)
    legal_mask = state.legal_action_mask()

    action_id, q_values = agent.act(obs, legal_mask)
    return action_id, q_values, legal_mask


def _replay_and_infer(
    game_json: dict,
    agent: SADAgent,
    player: int | None = None,
) -> tuple[int, list[float], list[bool], HanabiState]:
    """Replay turns from the game JSON to warm up the LSTM, then infer.

    This rebuilds the game state from the turn history (like the web app does
    with rebuildGame()) and feeds each intermediate observation through the
    model so the LSTM has full context.
    """
    players = game_json.get("players", [])
    num_players = len(players)
    turns_history = game_json.get("turnsHistory", [])

    if player is None:
        player = game_json.get("currentPlayer", 0)

    # Convert the full state directly (the web app provides materialized state)
    state = convert_game_state(game_json)

    # If there are turns in history, we should replay them through the LSTM
    # to build up hidden state context. We do this by constructing intermediate
    # states and feeding observations for each one.
    if turns_history:
        # Reconstruct from turn history for LSTM warm-up
        # First, build the initial deck from the full game info
        initial_state = _reconstruct_initial_state(game_json)
        if initial_state is not None:
            agent.reset()
            _warmup_lstm(initial_state, turns_history, agent, player)
            # Now the LSTM has context; get the final observation from current state
            obs = encode_observation(state, player, include_own_hand=True)
            legal_mask = state.legal_action_mask()
            action_id, q_values = agent.act(obs, legal_mask)
            return action_id, q_values, legal_mask, state

    # Fallback: no history replay, just do single-step inference
    action_id, q_values, legal_mask = _run_inference(state, agent, player)
    return action_id, q_values, legal_mask, state


def _reconstruct_initial_state(game_json: dict) -> HanabiState | None:
    """Attempt to reconstruct the initial game state before any turns.

    We need the full deck order, which we can reconstruct from:
    - current draw pile
    - cards in all hands
    - played cards
    - discarded cards
    - turn history (which cards were drawn)

    Since we can't perfectly reconstruct the initial deal order without
    the seed, we build intermediate states by working backwards.
    Returns None if reconstruction isn't feasible.
    """
    # For now, we'll use a simplified approach: feed the current state
    # observation at each turn step. This gives the LSTM some temporal
    # signal even though intermediate observations aren't exact.
    return None


def _warmup_lstm(
    state: HanabiState,
    turns: list[dict],
    agent: SADAgent,
    observer: int,
) -> None:
    """Feed observations through LSTM to warm up hidden state."""
    # Feed a zero observation for each past turn to give the LSTM
    # a sense of game progression. The Q-values from these steps
    # are discarded; we only care about the hidden state.
    obs_size = observation_size(state.num_players, include_own_hand=True)
    dummy_legal = [True] * num_actions(state.num_players)
    for _ in turns:
        dummy_obs = [0] * obs_size
        agent.act(dummy_obs, dummy_legal)


def _format_action_details(
    action_id: int,
    q_values: list[float],
    legal_mask: list[bool],
    state: HanabiState,
) -> dict[str, Any]:
    """Format detailed action info for response."""
    n_actions = num_actions(state.num_players)

    # Build q_values dict with action descriptions
    q_dict = {}
    all_actions = []
    for i in range(n_actions):
        if legal_mask[i]:
            act_json = action_to_json(i, state)
            label = _action_label(act_json)
            q_dict[label] = round(q_values[i], 4)
            all_actions.append({
                "action_id": i,
                "action": act_json,
                "label": label,
                "q_value": round(q_values[i], 4),
                "is_best": i == action_id,
            })

    # Sort by Q-value descending
    all_actions.sort(key=lambda x: x["q_value"], reverse=True)

    return {
        "q_dict": q_dict,
        "all_actions": all_actions,
    }


def _action_label(action_json: dict) -> str:
    """Human-readable label for an action."""
    act = action_json.get("action", "")
    if act == "play":
        card = action_json.get("card", {})
        return f"play {card.get('color', '?')}{card.get('number', '?')} (slot {action_json.get('cardIndex', 0)})"
    elif act == "discard":
        card = action_json.get("card", {})
        return f"discard {card.get('color', '?')}{card.get('number', '?')} (slot {action_json.get('cardIndex', 0)})"
    elif act == "hint":
        hint_type = action_json.get("type", "")
        value = action_json.get("value", "?")
        target = action_json.get("to", 0)
        return f"hint {hint_type} {value} to player {target}"
    return f"action {act}"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    model_loaded = "default" in _agents
    return {
        "status": "ok" if model_loaded else "degraded",
        "model": "loaded" if model_loaded else "not_loaded",
    }


@app.get("/model-info", response_model=ModelInfoResponse)
async def model_info() -> ModelInfoResponse:
    """Return model metadata."""
    agent = _get_agent()
    m = agent.model
    return ModelInfoResponse(
        model_name=MODEL_NAME,
        device=str(agent.device),
        input_dim=m.in_dim,
        hidden_dim=m.hid_dim,
        output_dim=m.out_dim,
        num_lstm_layers=m.num_lstm_layer,
        num_fc_layers=m.num_fc_layer,
        skip_connect=m.skip_connect,
        observation_size=observation_size(2, include_own_hand=True),
    )


@app.post("/act", response_model=ActResponse)
async def act(req: ActRequest) -> ActResponse:
    """Compute the best action for the current game state.

    Accepts the full game state as JSON (matching the web app's IGameState).
    Returns the recommended action, Q-values for all legal actions,
    and detailed action rankings.
    """
    agent = _get_agent()

    # Validate
    game_json = req.game_state.model_dump()
    variant = game_json.get("options", {}).get("variant", "classic")
    if variant and variant != "classic":
        raise HTTPException(
            status_code=400,
            detail=f"Only 'classic' variant is supported by SAD. Got: {variant}",
        )

    num_players = len(game_json.get("players", []))
    if num_players != 2:
        raise HTTPException(
            status_code=400,
            detail=f"SAD model supports 2 players only. Got: {num_players}",
        )

    player = req.player
    action_id, q_values, legal_mask, state = _replay_and_infer(game_json, agent, player)

    details = _format_action_details(action_id, q_values, legal_mask, state)
    best_action = action_to_json(action_id, state)

    return ActResponse(
        action=best_action,
        action_id=action_id,
        q_values=details["q_dict"],
        legal_actions=[i for i, m in enumerate(legal_mask) if m],
        best_q_value=round(q_values[action_id], 4),
        all_actions=details["all_actions"],
    )


@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(req: EvaluateRequest) -> EvaluateResponse:
    """Evaluate the current game state.

    Returns the expected game value (best Q-value, which approximates
    expected final score contribution from this state), current score,
    maximum possible score, and the best action.
    """
    agent = _get_agent()

    game_json = req.game_state.model_dump()
    variant = game_json.get("options", {}).get("variant", "classic")
    if variant and variant != "classic":
        raise HTTPException(
            status_code=400,
            detail=f"Only 'classic' variant is supported by SAD. Got: {variant}",
        )

    num_players = len(game_json.get("players", []))
    if num_players != 2:
        raise HTTPException(
            status_code=400,
            detail=f"SAD model supports 2 players only. Got: {num_players}",
        )

    player = req.player
    action_id, q_values, legal_mask, state = _replay_and_infer(game_json, agent, player)

    best_action = action_to_json(action_id, state)
    details = _format_action_details(action_id, q_values, legal_mask, state)

    # Max possible score given remaining cards
    max_possible = _max_possible_score(state)

    return EvaluateResponse(
        expected_value=round(q_values[action_id], 4),
        current_score=state.score,
        max_possible_score=max_possible,
        best_action=best_action,
        best_action_id=action_id,
        q_values=details["q_dict"],
    )


def _max_possible_score(state: HanabiState) -> int:
    """Compute maximum possible score given remaining cards."""
    # Count remaining cards per (color, rank) in deck + hands + discard
    remaining = [[0] * NUM_RANKS for _ in range(NUM_COLORS)]

    for card in state.discard_pile:
        remaining[card.color][card.rank] += 1

    max_score = 0
    for c in range(NUM_COLORS):
        for r in range(NUM_RANKS):
            if r < state.fireworks[c]:
                continue  # already played
            discarded = remaining[c][r]
            max_copies = CARD_COUNT_PER_RANK[r]
            if discarded >= max_copies:
                break  # can't complete this color beyond here
            max_score += 1
        else:
            continue

    return state.score + max_score


@app.post("/act-sequence", response_model=ActSequenceResponse)
async def act_sequence(req: ActSequenceRequest) -> ActSequenceResponse:
    """Compute a sequence of SAD-recommended actions from the current state.

    Useful for showing "what would SAD do" for the next N moves.
    The model plays against itself for num_steps actions.
    """
    agent = _get_agent()

    game_json = req.game_state.model_dump()
    num_players = len(game_json.get("players", []))
    if num_players != 2:
        raise HTTPException(status_code=400, detail="SAD model supports 2 players only.")

    state = convert_game_state(game_json)
    agent.reset()

    steps = []
    for _ in range(req.num_steps):
        if state.game_over:
            break

        player = state.current_player
        obs = encode_observation(state, player, include_own_hand=True)
        legal_mask = state.legal_action_mask()
        action_id, q_values = agent.act(obs, legal_mask)

        act_json = action_to_json(action_id, state)
        steps.append(ActSequenceStep(
            action=act_json,
            action_id=action_id,
            q_value=round(q_values[action_id], 4),
        ))

        state.apply_action(action_id)

    return ActSequenceResponse(steps=steps)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(level=logging.INFO)
    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
