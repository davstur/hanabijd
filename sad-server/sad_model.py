"""SAD (Simplified Action Decoder) R2D2 model definition.

This is a pure PyTorch reimplementation of the R2D2Net from
facebookresearch/hanabi_SAD, designed to load the pre-trained .pthw
weight files and run inference without the C++ rela infrastructure.
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class R2D2Net(nn.Module):
    """Dueling R2D2 network used by SAD agents.

    Architecture:
        input -> FC+ReLU -> LSTM -> (optional skip) -> dueling heads -> Q-values

    This matches the architecture in hanabi_SAD/pyhanabi/r2d2.py exactly
    so that we can load the pre-trained weights.
    """

    def __init__(
        self,
        in_dim: int,
        hid_dim: int,
        out_dim: int,
        num_lstm_layer: int = 2,
        num_fc_layer: int = 1,
        skip_connect: bool = False,
    ):
        super().__init__()
        self.in_dim = in_dim
        self.hid_dim = hid_dim
        self.out_dim = out_dim
        self.num_lstm_layer = num_lstm_layer
        self.num_fc_layer = num_fc_layer
        self.skip_connect = skip_connect

        # Input FC layers
        self.net = nn.Sequential()
        for i in range(num_fc_layer):
            dim_in = in_dim if i == 0 else hid_dim
            self.net.add_module(f"fc_{i}", nn.Linear(dim_in, hid_dim))
            self.net.add_module(f"relu_{i}", nn.ReLU())

        # LSTM
        self.lstm = nn.LSTM(
            hid_dim,
            hid_dim,
            num_layers=num_lstm_layer,
            batch_first=True,
        )
        self.lstm.flatten_parameters()

        # Dueling heads
        fc_v_in = hid_dim * 2 if skip_connect else hid_dim
        fc_a_in = hid_dim * 2 if skip_connect else hid_dim
        self.fc_v = nn.Linear(fc_v_in, 1)
        self.fc_a = nn.Linear(fc_a_in, out_dim)

    def forward(
        self,
        obs: torch.Tensor,
        hid: dict[str, torch.Tensor] | None = None,
    ) -> tuple[torch.Tensor, dict[str, torch.Tensor]]:
        """Forward pass.

        Args:
            obs: (batch, in_dim) or (batch, seq, in_dim)
            hid: {"h0": (num_layers, batch, hid), "c0": same} or None

        Returns:
            q_values: (batch, [seq,] out_dim)
            new_hid: updated LSTM hidden state
        """
        squeeze = False
        if obs.dim() == 2:
            obs = obs.unsqueeze(1)  # add seq dim
            squeeze = True

        batch, seq, _ = obs.shape

        # FC layers
        x = self.net(obs)  # (batch, seq, hid)

        # LSTM
        if hid is None:
            h0 = torch.zeros(self.num_lstm_layer, batch, self.hid_dim, device=obs.device)
            c0 = torch.zeros(self.num_lstm_layer, batch, self.hid_dim, device=obs.device)
        else:
            h0 = hid["h0"]
            c0 = hid["c0"]

        lstm_out, (hn, cn) = self.lstm(x, (h0, c0))

        # Optional skip connection
        if self.skip_connect:
            lstm_out = torch.cat([lstm_out, x], dim=-1)

        # Dueling architecture
        v = self.fc_v(lstm_out)  # (batch, seq, 1)
        a = self.fc_a(lstm_out)  # (batch, seq, out_dim)
        q = v + a - a.mean(dim=-1, keepdim=True)

        if squeeze:
            q = q.squeeze(1)

        new_hid = {"h0": hn.detach(), "c0": cn.detach()}
        return q, new_hid


class SADAgent:
    """Wraps a R2D2Net for inference, handling greedy action selection."""

    def __init__(self, model: R2D2Net, device: torch.device):
        self.model = model
        self.device = device
        self.hid: dict[str, torch.Tensor] | None = None

    def reset(self) -> None:
        """Reset hidden state for a new episode."""
        self.hid = None

    @torch.no_grad()
    def act(self, obs: list[int], legal_actions: list[bool]) -> tuple[int, list[float]]:
        """Select action given observation and legal action mask.

        Args:
            obs: flat observation vector
            legal_actions: boolean mask of legal actions

        Returns:
            action_id: selected action index
            q_values: Q-values for all actions (masked illegal = -inf)
        """
        obs_t = torch.tensor(obs, dtype=torch.float32, device=self.device).unsqueeze(0)
        mask_t = torch.tensor(legal_actions, dtype=torch.bool, device=self.device).unsqueeze(0)

        q, self.hid = self.model(obs_t, self.hid)  # (1, out_dim)

        # Mask illegal actions
        q_masked = q.clone()
        q_masked[~mask_t] = float("-inf")

        action = q_masked.argmax(dim=-1).item()
        return action, q[0].tolist()


def load_sad_model(
    weight_path: str,
    device: torch.device | str = "cpu",
) -> SADAgent:
    """Load a pre-trained SAD model from a .pthw file.

    The .pthw file is a state_dict. We infer architecture parameters
    from the tensor shapes.
    """
    device = torch.device(device)
    state_dict = torch.load(weight_path, map_location=device, weights_only=False)

    # Infer dimensions from weight shapes
    in_dim = state_dict["net.fc_0.weight"].shape[1]
    hid_dim = state_dict["net.fc_0.weight"].shape[0]
    out_dim = state_dict["fc_a.weight"].shape[0]

    # Count FC layers
    num_fc_layer = 0
    while f"net.fc_{num_fc_layer}.weight" in state_dict:
        num_fc_layer += 1

    # Infer LSTM layers
    num_lstm_layer = 0
    while f"lstm.weight_ih_l{num_lstm_layer}" in state_dict:
        num_lstm_layer += 1

    # Check skip connection (fc_v input dim would be 2 * hid_dim)
    skip_connect = state_dict["fc_v.weight"].shape[1] == hid_dim * 2

    model = R2D2Net(
        in_dim=in_dim,
        hid_dim=hid_dim,
        out_dim=out_dim,
        num_lstm_layer=num_lstm_layer,
        num_fc_layer=num_fc_layer,
        skip_connect=skip_connect,
    )

    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    return SADAgent(model, device)
