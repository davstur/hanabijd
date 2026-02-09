#!/usr/bin/env python3
"""Download pre-trained SAD model weights from Facebook Research.

Usage:
    python download_model.py [--model-dir models/]

Downloads the SAD 2-player model weights used for inference.
"""

from __future__ import annotations

import argparse
import os
import sys

import requests

# Known model URLs from facebookresearch/hanabi_SAD
MODELS = {
    "sad_2p_10": {
        "url": "https://dl.fbaipublicfiles.com/hanabi_sad/models/sad_2p_10.pthw",
        "filename": "sad_2p_10.pthw",
        "description": "SAD 2-player model (seed 10)",
    },
}

DEFAULT_MODEL = "sad_2p_10"


def download_file(url: str, dest: str) -> None:
    """Download a file with progress indication."""
    print(f"Downloading {url} -> {dest}")
    response = requests.get(url, stream=True, timeout=300)
    response.raise_for_status()

    total = int(response.headers.get("content-length", 0))
    downloaded = 0

    with open(dest, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            downloaded += len(chunk)
            if total > 0:
                pct = downloaded * 100 // total
                print(f"\r  {downloaded:,} / {total:,} bytes ({pct}%)", end="", flush=True)

    print(f"\n  Done: {os.path.getsize(dest):,} bytes")


def main() -> None:
    parser = argparse.ArgumentParser(description="Download SAD model weights")
    parser.add_argument(
        "--model-dir",
        default="models",
        help="Directory to save models (default: models/)",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        choices=list(MODELS.keys()),
        help=f"Model to download (default: {DEFAULT_MODEL})",
    )
    args = parser.parse_args()

    os.makedirs(args.model_dir, exist_ok=True)

    info = MODELS[args.model]
    dest = os.path.join(args.model_dir, info["filename"])

    if os.path.exists(dest):
        print(f"Model already exists: {dest}")
        return

    print(f"Model: {info['description']}")
    try:
        download_file(info["url"], dest)
    except requests.RequestException as e:
        print(f"Error downloading model: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Model saved to {dest}")


if __name__ == "__main__":
    main()
