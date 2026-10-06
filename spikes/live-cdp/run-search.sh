#!/bin/bash
set -u
source "$(dirname "$0")/app.sh"
app_run "${1:-run}" search-jump.ts "${1:-run}"
