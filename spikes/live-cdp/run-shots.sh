#!/bin/bash
set -u
TAG=${1:?usage: run-shots.sh <tag> <screen id>…}
shift
source "$(dirname "$0")/app.sh"
[ -e "$OUT/shots-$TAG" ] && { echo "out/shots-$TAG exists, pick another tag"; exit 1; }
app_run "$TAG" shots.ts "$TAG" "$@"
