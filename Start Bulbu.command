#!/bin/zsh
# Double-click to run Bulbu: API on :8787, web app on http://localhost:5173
cd "$(dirname "$0")"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
major=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')
if [ -z "$major" ] || [ "$major" -lt 22 ]; then
  command -v nvm >/dev/null && (nvm use 22 >/dev/null 2>&1 || nvm install 22)
fi
echo "Node $(node -v)"
[ -d node_modules ] || npm install
[ -f server/data/bulbu.db ] || npm run seed
npm run dev
