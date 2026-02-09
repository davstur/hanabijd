# SAD Hanabi API Server
# Multi-stage build: download model weights, then build slim runtime image

# --- Stage 1: Download model weights ---
FROM python:3.12-slim AS downloader

RUN pip install --no-cache-dir requests==2.32.3

WORKDIR /app
COPY download_model.py .

# Download SAD model weights at build time
RUN python download_model.py --model-dir models/

# --- Stage 2: Runtime ---
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py .

# Copy model weights from downloader stage
COPY --from=downloader /app/models/ models/

# Cloud Run uses PORT env var (defaults to 8080)
ENV PORT=8080
ENV MODEL_DIR=models
ENV MODEL_NAME=sad_2p_10.pthw
ENV DEVICE=cpu

# Run with uvicorn
# Cloud Run sends SIGTERM for graceful shutdown; uvicorn handles it.
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1

EXPOSE 8080
