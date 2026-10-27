#!/bin/zsh
# Double-click to install npm dependencies on this Mac (run after package.json changes).
cd "$(dirname "$0")"
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
npm install --no-audit --no-fund && echo "\n✅ Dependencies installed. You can close this window."
