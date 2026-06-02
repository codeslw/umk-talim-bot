#!/usr/bin/env sh
set -eu

OUT_DIR="${1:-./deploy/certs}"
mkdir -p "$OUT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$OUT_DIR/selfsigned.key" \
  -out "$OUT_DIR/selfsigned.crt" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:34.24.200.66"

chmod 600 "$OUT_DIR/selfsigned.key"
chmod 644 "$OUT_DIR/selfsigned.crt"

echo "Generated $OUT_DIR/selfsigned.crt and $OUT_DIR/selfsigned.key"
