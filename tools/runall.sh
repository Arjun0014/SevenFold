#!/bin/bash
# run perfect bot seeds 1-5 in parallel
cd "$(dirname "$0")/.."
for s in 1 2 3 4 5; do (node tools/botrun.mjs $s ${1:-13} $2 | head -1 | sed "s/^/seed $s: /") & done; wait
