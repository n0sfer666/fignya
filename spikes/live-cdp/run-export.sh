#!/bin/bash
set -u
source "$(dirname "$0")/app.sh"
export INSPECT=${INSPECT:-9446}
app_run "${1:-run}" export-flow.ts "${1:-run}" "${2:-2479:25954}"
