#!/bin/sh
set -e

DATA_DIR="/app/data"
DB_FILE="$DATA_DIR/db.json"

# Ensure the data directory exists (it should via the volume mount,
# but create it just in case).
mkdir -p "$DATA_DIR"

# If db.json doesn't exist yet (e.g. first run with an empty host-path
# volume on TrueNAS or similar), copy the seed file baked into the image.
if [ ! -f "$DB_FILE" ]; then
  echo "No db.json found in $DATA_DIR — seeding from image defaults..."
  cp /app/data-seed/db.json "$DB_FILE"
fi

# Hand off to the main process (next start, or whatever CMD is).
exec "$@"
