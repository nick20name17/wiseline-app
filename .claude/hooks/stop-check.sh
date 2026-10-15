#!/usr/bin/env bash
# Stop-hook gate: block finishing when the tree is red.
# Exit 2 blocks the turn and stderr becomes the reason Claude reads; any other non-zero code is a silent no-op.
set -uo pipefail
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

# Block once per stop: a red tree Claude cannot fix (someone else's edit in progress) would
# otherwise block every retry until Claude Code's cap overrides it.
grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0

if ! out=$(bun run verify 2>&1); then
  printf 'verify failed — fix before finishing:\n%s' "$out" >&2
  exit 2
fi
exit 0
