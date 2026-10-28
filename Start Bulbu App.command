#!/bin/zsh
# Double-click to run the Bulbu phone app: makes sure the API is up on :8787, then starts Expo.
# Scan the QR code with Expo Go (phone on the same Wi-Fi); the browser version opens on http://localhost:8081.
cd "$(dirname "$0")"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
major=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')
if [ -z "$major" ] || [ "$major" -lt 22 ]; then
  command -v nvm >/dev/null && (nvm use 22 >/dev/null 2>&1 || nvm install 22)
fi
echo "Node $(node -v)"
if curl -s --max-time 2 http://localhost:8787/api/health >/dev/null; then
  echo "✓ Bulbu API already running on :8787"
else
  echo "Starting the Bulbu API (log: server-dev.log)…"
  [ -d node_modules ] || npm install --no-audit --no-fund
  [ -f server/data/bulbu.db ] || npm run seed
  (npm run dev > server-dev.log 2>&1 &)
  sleep 4
fi
cd apps/mobile
[ -d node_modules ] || npm install --no-audit --no-fund
npx expo start --go --web
