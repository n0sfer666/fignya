#!/bin/bash
set -u
TAG=${1:?usage: run-key-zoom.sh <tag> [page] [gap ms]}
shift
source "$(dirname "$0")/app.sh"
app_run "$TAG" key-zoom.ts "$@"
