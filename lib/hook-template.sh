#!/usr/bin/env bash
#

NODE=$(type -P node)
if [ -z "$NODE" ]; then
  # Bootstrap nvm environment, for GUI tools.
  # This assumes nvm was installed per-user in `~/.nvm`.
  if [ -z "$NVM_DIR" ]; then
    export NVM_DIR="$HOME/.nvm"
  fi
  NVM_SH="$NVM_DIR/nvm.sh"
  if [ -x "$NVM_SH" ]; then
    source "$NVM_SH"
  else
    echo "skipping git-hooks: nvm.sh at $NVM_SH is missing, unreadable, or not executable!" >&2
    exit 0
  fi
fi

CMD='%s/../bin/git-hooks'
if [ -x "$CMD" ]; then
  "$CMD" --run $0 $2
else
  echo "skipping git-hooks: missing node module $CMD" >&2
  exit 0
fi

# end
