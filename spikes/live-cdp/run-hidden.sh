#!/bin/bash
set -u
TAG=${1:-run}
source "$(dirname "$0")/app.sh"
app_start "$TAG"
PORT=$PORT caffeinate -d -i bun "$S/hidden-warmup.ts"
code=$?
app_finish "$TAG"
echo "exit $code"
exit $code
