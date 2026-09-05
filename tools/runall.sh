#!/bin/bash
# run the perfect bot on seeds 1-8 in parallel: bash tools/runall.sh [--idle|--noblock]
cd "$(dirname "$0")/.."
for s in 1 2 3 4 5 6 7 8; do (node tools/botrun.mjs $s $s $1) & done; wait
