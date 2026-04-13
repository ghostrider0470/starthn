#!/usr/bin/env bash
# One-shot backfill sweep for the image pipeline.
# Walks all blobs in blog-images/ that don't yet have processed variants,
# generates webp variants, and syncs the manifest to D1 via the Worker.
#
# Usage:
#   export IMAGE_SWEEP_SECRET=<secret-from-azure-appsettings>
#   bash scripts/run-sweep.sh

set -euo pipefail

: "${IMAGE_SWEEP_SECRET:?Set IMAGE_SWEEP_SECRET first}"
URL="https://ht-func-prod.azurewebsites.net/api/manage/images/sweep?batchSize=20"

total_processed=0
total_errors=0
batch=0

while true; do
  batch=$((batch + 1))
  echo "=== Batch $batch ==="
  response=$(curl -s -X POST "$URL" -H "X-Internal-Auth: $IMAGE_SWEEP_SECRET")

  # Pretty-print + extract fields using node (no jq dependency).
  echo "$response" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf-8')); console.log(JSON.stringify(d,null,2))"

  hasMore=$(echo "$response" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf-8')).hasMore)")
  processed=$(echo "$response" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf-8')).processed ?? 0)")
  errors=$(echo "$response" | node -e "console.log((JSON.parse(require('fs').readFileSync(0,'utf-8')).errors ?? []).length)")
  total_processed=$((total_processed + processed))
  total_errors=$((total_errors + errors))

  if [ "$hasMore" != "true" ]; then
    echo ""
    echo "Sweep complete. total_processed=$total_processed total_errors=$total_errors"
    break
  fi
  sleep 2
done
