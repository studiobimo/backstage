#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ADMIN_DIR="$ROOT/apps/admin"
SITE_DIR="$ROOT/apps/site"
SHARED_STATE="$ROOT/.dev-state"
ADMIN_PORT=5173
SITE_PORT=5174

listeners() {
    lsof -nP -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null || true
}

describe_listener() {
    local pid="$1" command cwd
    command="$(ps -o command= -p "$pid" 2>/dev/null | cut -c1-160 || true)"
    cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' || true)"
    echo "[dev]   pid $pid  cwd ${cwd:-unknown}"
    echo "[dev]           ${command:-unknown command}"
}

require_free_port() {
    local port="$1" pids pid
    pids="$(listeners "$port")"
    [ -n "$pids" ] || return 0
    echo "[dev] port $port is already in use:" >&2
    for pid in $pids; do describe_listener "$pid" >&2; done
    cat >&2 <<EOF
[dev]
[dev] If that server belongs to another session, stop it there (Ctrl-C) and run make again.
[dev] If it is stale and no session uses it, stop it by hand:
[dev]
[dev]   kill $(echo "$pids" | tr '\n' ' ')
[dev]
[dev] If it is still running after a few seconds, force it:
[dev]
[dev]   kill -9 $(echo "$pids" | tr '\n' ' ')
[dev]
[dev] Then run: make -C .devtools dev
EOF
    exit 1
}

require_free_port "$ADMIN_PORT"
require_free_port "$SITE_PORT"

stop_children() {
    trap - INT TERM EXIT
    local pids
    pids="$(jobs -p)"
    # shellcheck disable=SC2086
    [ -n "$pids" ] && kill $pids 2>/dev/null
    wait 2>/dev/null || true
}
trap stop_children INT TERM EXIT

echo "[dev] applying local D1 migrations to the shared state in $SHARED_STATE"
(cd "$ADMIN_DIR" && pnpm exec wrangler d1 migrations apply DB --local --persist-to "$SHARED_STATE")

echo "[dev] admin http://localhost:$ADMIN_PORT  site http://localhost:$SITE_PORT"
(cd "$ADMIN_DIR" && exec pnpm exec vite --port "$ADMIN_PORT" --strictPort) 2>&1 | sed 's/^/[admin] /' &
(cd "$SITE_DIR" && exec pnpm exec vite --port "$SITE_PORT" --strictPort) 2>&1 | sed 's/^/[site]  /' &
wait
