#!/usr/bin/env bash
set -u
export PATH="/usr/sbin:/usr/bin:/bin:/sbin:$PATH"

DEV_PORTS="3000 4173 8787 8788"
VITE_PORTS_FIRST=5173
VITE_PORTS_LAST=5199
GRACE_CHECKS=6
GRACE_SECONDS=0.5
DEV_SERVER_PATTERN='vite|wrangler|workerd|miniflare|esbuild|node'
PROTECTED_APP_PATTERN='Visual Studio Code|Code Helper|Electron|Cursor|Claude|Terminal|iTerm|Ghostty|Warp|Slack|Xcode'

dry_run=0
extra_ports=""
found=0
stopped=0
failed=0
seen=" "

for arg in "$@"; do
    case "$arg" in
        -n|--dry-run) dry_run=1 ;;
        ""|*[!0-9]*)
            echo "free-dev-ports: '$arg' is not a port number (or --dry-run)" >&2
            exit 2 ;;
        *) extra_ports="$extra_ports $arg" ;;
    esac
done

if ! command -v lsof >/dev/null 2>&1; then
    echo "free-dev-ports: lsof is not installed, nothing was stopped" >&2
    exit 1
fi

ports() {
    for port in $DEV_PORTS $extra_ports; do
        printf '%s\n' "$port"
    done
    port=$VITE_PORTS_FIRST
    while [ "$port" -le "$VITE_PORTS_LAST" ]; do
        printf '%s\n' "$port"
        port=$((port + 1))
    done
}

listeners() {
    lsof -a -nP -t -sTCP:LISTEN -iTCP:"$1" 2>/dev/null | sort -u
}

is_dev_server() {
    local command_line="$1" executable="$2"
    printf '%s' "$command_line" | grep -Eqi "$DEV_SERVER_PATTERN" || return 1
    printf '%s' "$executable" | grep -Eqi "$PROTECTED_APP_PATTERN" && return 1
    return 0
}

still_running() {
    kill -0 "$1" 2>/dev/null
}

wait_for_exit() {
    local pid="$1" checks=0
    while still_running "$pid" && [ "$checks" -lt "$GRACE_CHECKS" ]; do
        sleep "$GRACE_SECONDS"
        checks=$((checks + 1))
    done
    ! still_running "$pid"
}

stop_listener() {
    local port="$1" pid="$2" command_line executable
    command_line="$(ps -o command= -p "$pid" 2>/dev/null)"
    executable="$(ps -o comm= -p "$pid" 2>/dev/null)"
    found=$((found + 1))

    if ! is_dev_server "$command_line" "$executable"; then
        printf 'skip     :%s  pid %s is not a dev server: %s\n' "$port" "$pid" "$executable"
        return
    fi
    if [ "$dry_run" -eq 1 ]; then
        printf 'would stop :%s  pid %s  %s\n' "$port" "$pid" "$executable"
        return
    fi

    kill -TERM "$pid" 2>/dev/null
    if ! wait_for_exit "$pid"; then
        kill -KILL "$pid" 2>/dev/null
        sleep 0.2
    fi

    if still_running "$pid"; then
        failed=$((failed + 1))
        printf 'FAILED   :%s  pid %s did not exit: %s\n' "$port" "$pid" "$executable" >&2
    else
        stopped=$((stopped + 1))
        printf 'stopped  :%s  pid %s  %s\n' "$port" "$pid" "$executable"
    fi
}

while read -r port; do
    for pid in $(listeners "$port"); do
        case "$seen" in
            *" $pid "*) continue ;;
        esac
        seen="$seen$pid "
        stop_listener "$port" "$pid"
    done
done < <(ports)

if [ "$found" -eq 0 ]; then
    echo "No dev servers are listening on the dev ports."
    exit 0
fi

if [ "$dry_run" -eq 1 ]; then
    exit 0
fi

echo "Done: $stopped stopped, $failed failed."
[ "$failed" -eq 0 ]
