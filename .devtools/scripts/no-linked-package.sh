#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
pattern="@studiobimo/backstage'?:? +link:|^ +version: link:.*packages/backstage"
linked="$(grep -nE "$pattern" "$root/pnpm-workspace.yaml" "$root/pnpm-lock.yaml" || true)"

if [ -n "$linked" ]; then
    printf '%s\n' "$linked"
    printf '\n@studiobimo/backstage is linked to the workspace source. Run: make -C .devtools unlink-local\n' >&2
    exit 1
fi
