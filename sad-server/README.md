# SAD Hanabi API Server

Stateless API server for computing expected game value and best moves using the **SAD** (Simplified Action Decoder) model from [Facebook Research](https://github.com/facebookresearch/hanabi_SAD). Designed for deployment on Google Cloud Run.

## What is SAD?

SAD is a deep reinforcement learning agent for the cooperative card game Hanabi, published by Facebook AI Research (FAIR) at ICLR 2020. It uses a Dueling R2D2 (Recurrent Replay Distributed DQN) architecture with a "Simplified Action Decoder" that resolves the exploration/exploitation tension in multi-agent RL.

The pre-trained 2-player model achieves near-optimal scores on the classic 5-color Hanabi variant.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/act` | Get best action for current game state |
| `POST` | `/evaluate` | Get expected game value and best action |
| `POST` | `/act-sequence` | Compute N future SAD-recommended moves |
| `GET` | `/health` | Health check |
| `GET` | `/model-info` | Model metadata |
| `GET` | `/docs` | Interactive Swagger UI |

### POST /act

Returns the SAD-recommended action for the current game state.

```bash
curl -X POST http://localhost:8080/act \
  -H "Content-Type: application/json" \
  -d '{
    "game_state": {
      "players": [
        {"name": "Alice", "hand": [{"color": "red", "number": 1}, ...]},
        {"name": "Bob", "hand": [{"color": "blue", "number": 3}, ...]}
      ],
      "playedCards": [],
      "discardPile": [],
      "drawPile": [...],
      "tokens": {"hints": 8, "strikes": 0},
      "currentPlayer": 0,
      "turnsHistory": [],
      "status": "ongoing",
      "options": {"variant": "classic", "playersCount": 2}
    }
  }'
```

Response:

```json
{
  "action": {"action": "hint", "from": 0, "to": 1, "type": "color", "value": "red", "cardsIndex": [0, 2]},
  "action_id": 10,
  "q_values": {"hint color red to player 1": 22.15, "play red1 (slot 0)": 18.32, ...},
  "legal_actions": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, ...],
  "best_q_value": 22.15,
  "all_actions": [...]
}
```

### POST /evaluate

Returns the expected game value (Q-value of the best action), which approximates the expected final score from the current state.

### POST /act-sequence

Plays the SAD model against itself for N steps from the given state. Useful for "what would SAD do?" analysis.

## Local Development

### Prerequisites

- Python 3.12+
- ~2GB disk for model weights + PyTorch

### Setup

```bash
cd sad-server

# Install dependencies
pip install -r requirements.txt

# Download SAD model weights (~18MB)
python download_model.py

# Run server
python main.py
```

The server starts at `http://localhost:8080`. Interactive docs at `http://localhost:8080/docs`.

### Docker

```bash
# Build (downloads model during build)
docker build -t sad-hanabi-api .

# Run
docker run -p 8080:8080 sad-hanabi-api
```

## Deploy to Cloud Run

### Option A: gcloud CLI

```bash
cd sad-server

# Build and deploy
gcloud run deploy sad-hanabi-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 10
```

### Option B: Cloud Build

```bash
cd sad-server
gcloud builds submit --config cloudbuild.yaml .
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port (set by Cloud Run) |
| `MODEL_DIR` | `models` | Directory containing model weights |
| `MODEL_NAME` | `sad_2p_10.pthw` | Model weights filename |
| `DEVICE` | `cpu` | PyTorch device (`cpu` or `cuda`) |

## Limitations

- **2 players only**: The pre-trained SAD model is for 2-player games
- **Classic variant only**: 5 colors (RGBWY), standard rules
- **Stateless LSTM**: Each request resets the LSTM hidden state since the server is stateless. The model still provides strong action selection from a single observation, but doesn't have full episode context
- **CPU inference**: Designed for CPU. GPU can be enabled via `DEVICE=cuda` but requires a CUDA-enabled base image

## Architecture

```
sad-server/
├── main.py              # FastAPI server with API endpoints
├── sad_model.py         # R2D2 dueling network (PyTorch)
├── observation.py       # HLE canonical observation encoder
├── hanabi_game.py       # Pure Python Hanabi environment
├── convert_state.py     # Web app JSON <-> HanabiState bridge
├── download_model.py    # Model weight downloader
├── Dockerfile           # Multi-stage Docker build
├── cloudbuild.yaml      # Cloud Build deployment config
├── requirements.txt     # Python dependencies
└── README.md
```

## References

- [SAD Paper (ICLR 2020)](https://arxiv.org/abs/1912.02288) - Hu & Foerster
- [hanabi_SAD GitHub](https://github.com/facebookresearch/hanabi_SAD) - Facebook Research
- [Hanabi Learning Environment](https://github.com/google-deepmind/hanabi-learning-environment) - DeepMind
