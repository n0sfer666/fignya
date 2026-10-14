#!/bin/bash
set -u
source "$(dirname "$0")/app.sh"
app_run "${1:-run}" swap-flow.ts "${1:-run}" "${2:-12645:34121}"
