#!/usr/bin/env python3
"""Generate a mock SAD model with random weights for local testing.

This creates a .pthw file with the correct R2D2 architecture so the
server can load it and run inference. The outputs will be random (not
meaningful) but the full pipeline can be validated end-to-end.
"""

import os
import torch
from sad_model import R2D2Net
from observation import observation_size
from hanabi_game import num_actions

NUM_PLAYERS = 2
IN_DIM = observation_size(NUM_PLAYERS, include_own_hand=True)
HID_DIM = 512
OUT_DIM = num_actions(NUM_PLAYERS)

def main():
    os.makedirs("models", exist_ok=True)
    path = "models/sad_2p_10.pthw"

    if os.path.exists(path):
        print(f"Already exists: {path}")
        return

    print(f"Creating mock SAD model: in_dim={IN_DIM}, hid_dim={HID_DIM}, out_dim={OUT_DIM}")
    model = R2D2Net(
        in_dim=IN_DIM,
        hid_dim=HID_DIM,
        out_dim=OUT_DIM,
        num_lstm_layer=2,
        num_fc_layer=1,
        skip_connect=False,
    )
    torch.save(model.state_dict(), path)
    print(f"Saved mock model to {path} ({os.path.getsize(path):,} bytes)")
    print("NOTE: This model has random weights and will not produce meaningful actions.")

if __name__ == "__main__":
    main()
