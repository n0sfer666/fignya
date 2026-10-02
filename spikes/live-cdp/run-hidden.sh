#!/bin/bash
set -u
S=$(cd "$(dirname "$0")" && pwd)
D=$S/../../apps/desktop
PORT=${PORT:-9445}
TAG=${1:-run}
THUMBS="$HOME/Library/Application Support/fignya/thumbs"
OUT=$S/out
mkdir -p "$OUT" "$THUMBS"
[ -e "$OUT/thumbs-$TAG" ] && { echo "out/thumbs-$TAG exists, pick another tag"; exit 1; }
FIG=$OUT/copy.fig
rm -f "$FIG"
cp -c "${FIG_FILE:?}" "$FIG" && touch "$FIG" || exit 1
stop() {
  pkill -f "remoteDebuggingPort $PORT"; pkill -f "remote-debugging-port=$PORT"
  for _ in $(seq 1 20); do curl -s -m 1 "http://127.0.0.1:$PORT/json" >/dev/null || break; sleep 1; done
}
stop
ls "$THUMBS" | sort > "$OUT/before-$TAG.txt"
(cd "$D" && FIG_FILE="$FIG" ./node_modules/.bin/electron-vite dev --remoteDebuggingPort "$PORT" > "$OUT/app-$TAG.log" 2>&1 &)
PORT=$PORT caffeinate -d -i bun "$S/hidden-warmup.ts"
code=$?
stop
created=$(ls "$THUMBS" | sort | comm -13 "$OUT/before-$TAG.txt" -)
mkdir -p "$OUT/thumbs-$TAG"
for dir in $created; do mv "$THUMBS/$dir" "$OUT/thumbs-$TAG/"; done
echo "exit $code, moved: ${created:-none}"
exit $code
