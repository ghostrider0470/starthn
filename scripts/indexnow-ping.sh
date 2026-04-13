#!/bin/bash
# Ping IndexNow with ALL pages from sitemaps
# Usage: ./scripts/indexnow-ping.sh

HOST="www.horizon-tech.io"
KEY="ccf536f39896412a92fb14422b4d89d3"
SITEMAP_INDEX="https://$HOST/sitemap.xml"
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

echo "Fetching sitemap index..."

SUB_SITEMAPS=$(curl -s "$SITEMAP_INDEX" | grep -o '<loc>[^<]*</loc>' | sed 's/<loc>//;s/<\/loc>//')

ALL_URLS=()
for sitemap in $SUB_SITEMAPS; do
  urls=$(curl -s "$sitemap" | grep -o '<loc>[^<]*</loc>' | sed 's/<loc>//;s/<\/loc>//')
  while IFS= read -r url; do
    [ -n "$url" ] && ALL_URLS+=("$url")
  done <<< "$urls"
done

TOTAL=${#ALL_URLS[@]}
echo "Found $TOTAL URLs across all sitemaps"

if [ "$TOTAL" -eq 0 ]; then
  echo "No URLs found — check if sitemaps are accessible"
  exit 1
fi

BATCH_SIZE=200
for ((i=0; i<TOTAL; i+=BATCH_SIZE)); do
  BATCH=("${ALL_URLS[@]:i:BATCH_SIZE}")
  BATCH_COUNT=${#BATCH[@]}

  URL_JSON=$(printf '"%s",' "${BATCH[@]}")
  URL_JSON="[${URL_JSON%,}]"

  cat > "$TMPFILE" <<EOF
{"host":"$HOST","key":"$KEY","keyLocation":"https://$HOST/$KEY.txt","urlList":$URL_JSON}
EOF

  BATCH_NUM=$(( (i / BATCH_SIZE) + 1 ))
  echo "Submitting batch $BATCH_NUM ($BATCH_COUNT URLs)..."

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json" \
    -d @"$TMPFILE")

  echo "  Response: $HTTP_CODE"
  [ $((i + BATCH_SIZE)) -lt "$TOTAL" ] && sleep 1
done

echo "Done — $TOTAL URLs submitted to IndexNow"
