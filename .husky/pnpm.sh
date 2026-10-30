# Sourced by other hooks. Prefer Corepack's packageManager-pinned pnpm so a
# leftover standalone install (often ~/Library/pnpm @ 10) cannot run lint.

export CI=true
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh" 2>/dev/null
fi

if command -v corepack >/dev/null 2>&1; then
  pnpm() {
    corepack pnpm "$@"
  }
fi
