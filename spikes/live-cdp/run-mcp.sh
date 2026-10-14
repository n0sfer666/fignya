#!/bin/bash
set -u
export INSPECT=${INSPECT:-9446}
source "$(dirname "$0")/app.sh"
app_run "${1:-run}" mcp-flow.ts "${1:-run}" "${2:-2479:25954}"
