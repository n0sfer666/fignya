#!/bin/bash
set -u
source "$(dirname "$0")/app.sh"
export INSPECT=${INSPECT:-9446}
TAG=${1:-run}
SCREEN=${2:-9402:158357}
SIDECAR=$FIG.fignya
for t in "$TAG-save" "$TAG-reopen" "$TAG-stale"; do
  [ -e "$OUT/app-$t.log" ] || [ -e "$OUT/thumbs-$t" ] && { echo "tag $t already used in out/, pick another"; exit 1; }
done
rm -f "$SIDECAR" "$SIDECAR.bak"
code=0
for phase in save reopen stale; do
  if [ "$phase" = stale ]; then
    bun -e 'const p = process.argv[1]; const s = JSON.parse(await Bun.file(p).text()); s.base.sha256 = "0".repeat(64); await Bun.write(p, JSON.stringify(s));' "$SIDECAR" || exit 1
  fi
  app_start "$TAG-$phase"
  PORT=$PORT SIDECAR=$SIDECAR caffeinate -d -i bun "$S/save-flow.ts" "$phase" "$TAG-$phase" "$SCREEN"
  step=$?
  app_finish "$TAG-$phase"
  echo "$phase exit $step"
  [ $step -ne 0 ] && code=$step
done
echo "exit $code"
exit $code
