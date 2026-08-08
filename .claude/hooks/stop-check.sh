#!/usr/bin/env bash
# Stop-hook gate: block finishing when types/lint/doctor/tests are red.
# tsc -b is incremental (buildinfo); vitest runs only tests related to the
# working-tree diff. oxlint/react-doctor stay whole-project — both are fast
# and act as the safety net for changes outside the diff.
set -uo pipefail
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

bin=node_modules/.bin
fail=0
out=""

step() {
  local name=$1
  shift
  local o
  if ! o=$("$@" 2>&1); then
    fail=1
    out+=$'\n'"=== $name ==="$'\n'"$o"$'\n'
  fi
}

step "tsc -b" "$bin/tsc" -b
step "oxlint --type-aware" "$bin/oxlint" --type-aware
step "react-doctor" "$bin/react-doctor" . --no-score --no-supply-chain --blocking error

if git rev-parse --verify -q HEAD >/dev/null 2>&1; then
  step "vitest (changed)" "$bin/vitest" run --changed --passWithNoTests
else
  step "vitest" "$bin/vitest" run --passWithNoTests
fi

if [ "$fail" = "1" ]; then
  printf 'Type/lint/doctor/test checks failed — fix before finishing:\n%s' "$out" >&2
  exit 2
fi
exit 0
