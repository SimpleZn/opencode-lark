#!/bin/bash
# OhMyOpenClaw dedicated startup script
# Launches an independent opencode server on a configurable port and runs the bot
# Default port is 4097; port 4096 is reserved for development/TUI use

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load env
set -a && source .env && set +a

# Make port configurable via OPENCODE_SERVER_PORT env var (default 4097)
PORT=${OPENCODE_SERVER_PORT:-4097}
SERVER_URL="http://127.0.0.1:$PORT"

if [ -n "${OPENCODE_SERVER_URL:-}" ] && [ "$OPENCODE_SERVER_URL" != "$SERVER_URL" ]; then
  echo "[start] Overriding OPENCODE_SERVER_URL=$OPENCODE_SERVER_URL for dedicated server: $SERVER_URL"
fi
export OPENCODE_SERVER_URL="$SERVER_URL"

if command -v lsof >/dev/null 2>&1; then
  PORT_OWNER=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $1 " " $2}')
  if [ -n "$PORT_OWNER" ]; then
    echo "[start] Port $PORT is already in use by $PORT_OWNER"
    echo "[start] Stop that process or choose a different OPENCODE_SERVER_PORT."
    exit 1
  fi
fi

echo "[start] Starting dedicated opencode server on port $PORT..."
opencode serve --port "$PORT" &
OPENCODE_PID=$!
echo "[start] opencode server PID: $OPENCODE_PID"

# Wait for server to be ready
for i in $(seq 1 20); do
  if ! kill -0 "$OPENCODE_PID" 2>/dev/null; then
    echo "[start] opencode server exited before becoming ready"
    wait "$OPENCODE_PID"
    exit 1
  fi
  if curl -fsS "$SERVER_URL/session/status" > /dev/null 2>&1; then
    echo "[start] opencode server ready"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "[start] opencode server did not become ready at $SERVER_URL"
    kill "$OPENCODE_PID" 2>/dev/null
    exit 1
  fi
  echo "[start] Waiting for server... ($i/20)"
  sleep 1
done

# Some opencode failures happen just after the port opens. Give the process a
# short chance to report startup errors before launching the bot.
sleep 1
if ! kill -0 "$OPENCODE_PID" 2>/dev/null; then
  echo "[start] opencode server exited after readiness check"
  wait "$OPENCODE_PID"
  exit 1
fi

echo "[start] Starting opencode-lark bot..."
bun run src/index.ts &
BOT_PID=$!
echo "[start] bot PID: $BOT_PID"

(
  while kill -0 "$OPENCODE_PID" 2>/dev/null; do
    sleep 1
  done
  if kill -0 "$BOT_PID" 2>/dev/null; then
    echo "[start] opencode server exited; stopping bot"
    kill "$BOT_PID" 2>/dev/null
  fi
) &
WATCHER_PID=$!

# Trap signals to clean up both processes
cleanup() {
  echo "[start] Shutting down..."
  kill "$BOT_PID" 2>/dev/null
  kill "$OPENCODE_PID" 2>/dev/null
  kill "$WATCHER_PID" 2>/dev/null
  for _ in $(seq 1 5); do
    if ! kill -0 "$BOT_PID" 2>/dev/null && ! kill -0 "$OPENCODE_PID" 2>/dev/null && ! kill -0 "$WATCHER_PID" 2>/dev/null; then
      break
    fi
    sleep 1
  done
  kill -9 "$BOT_PID" "$OPENCODE_PID" "$WATCHER_PID" 2>/dev/null
  wait 2>/dev/null
  echo "[start] Done"
}
trap cleanup SIGTERM SIGINT

wait $BOT_PID
cleanup
