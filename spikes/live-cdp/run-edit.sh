#!/bin/bash
set -u
source "$(dirname "$0")/app.sh"
app_run "${1:-run}" edit-flow.ts "${1:-run}" "${2:-2479:25954}"
