S=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
D=$S/../../apps/desktop
PORT=${PORT:-9445}
THUMBS="$HOME/Library/Application Support/fignya/thumbs"
OUT=$S/out
FIG=$OUT/copy.fig
mkdir -p "$OUT" "$THUMBS"

app_stop() {
  pkill -f "remoteDebuggingPort $PORT"; pkill -f "remote-debugging-port=$PORT"
  for _ in $(seq 1 20); do curl -s -m 1 "http://127.0.0.1:$PORT/json" >/dev/null || break; sleep 1; done
}

app_start() {
  [ -e "$OUT/app-$1.log" ] || [ -e "$OUT/thumbs-$1" ] && { echo "tag $1 already used in out/, pick another"; exit 1; }
  rm -f "$FIG"
  cp -c "${FIG_FILE:?}" "$FIG" && touch "$FIG" || exit 1
  app_stop
  ls "$THUMBS" | sort > "$OUT/before-$1.txt"
  (cd "$D" && FIG_FILE="$FIG" ./node_modules/.bin/electron-vite dev --remoteDebuggingPort "$PORT" > "$OUT/app-$1.log" 2>&1 &)
}

app_finish() {
  app_stop
  local created
  created=$(ls "$THUMBS" | sort | comm -13 "$OUT/before-$1.txt" -)
  mkdir -p "$OUT/thumbs-$1"
  for dir in $created; do mv "$THUMBS/$dir" "$OUT/thumbs-$1/"; done
  echo "moved: ${created:-none}"
}
