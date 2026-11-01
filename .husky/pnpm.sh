# Sourced by other hooks. Prefer Corepack's packageManager-pinned pnpm so a
# leftover standalone install (often ~/Library/pnpm @ 10) cannot run lint.

export CI=true
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # `npm version` exports npm_config_prefix. nvm treats that as fatal and
  # returns 11, and husky runs hooks with `sh -e`, so the hook stops before lint.
  saved_npm_config_prefix=${npm_config_prefix-}
  saved_npm_config_prefix_upper=${NPM_CONFIG_PREFIX-}
  saved_prefix=${PREFIX-}
  unset npm_config_prefix NPM_CONFIG_PREFIX PREFIX
  set +e
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  set -e
  if [ -n "$saved_npm_config_prefix" ]; then
    export npm_config_prefix="$saved_npm_config_prefix"
  fi
  if [ -n "$saved_npm_config_prefix_upper" ]; then
    export NPM_CONFIG_PREFIX="$saved_npm_config_prefix_upper"
  fi
  if [ -n "$saved_prefix" ]; then
    export PREFIX="$saved_prefix"
  fi
fi

if command -v corepack >/dev/null 2>&1; then
  pnpm() {
    corepack pnpm "$@"
  }
fi
