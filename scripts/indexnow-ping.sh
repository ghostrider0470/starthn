#!/bin/bash
# Ping IndexNow with ALL pages from sitemaps
# Usage: ./scripts/indexnow-ping.sh
#
# Exits non-zero when no URLs are found or when IndexNow does not accept a
# batch (anything but HTTP 200/202), so CI and `npm run deploy` show failures.

HOST="www.starthn.ba"
KEY="ccf536f39896412a92fb14422b4d89d3"
SITEMAP_INDEX="https://$HOST/sitemap.xml"
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

echo "Fetching sitemap index..."

# -L: follow redirects, so a host change can never silently yield 0 URLs.
SUB_SITEMAPS=$(curl -sL "$SITEMAP_INDEX" | grep -o '<loc>[^<]*</loc>' | sed 's/<loc>//;s/<\/loc>//')

ALL_URLS=()
for sitemap in $SUB_SITEMAPS; do
  urls=$(curl -sL "$sitemap" | grep -o '<loc>[^<]*</loc>' | sed 's/<loc>//;s/<\/loc>//')
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

FAILED=0
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

  HTTP_CODE=$(curl -sL -o /dev/null -w "%{http_code}" \
    -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d @"$TMPFILE")

  echo "  Response: $HTTP_CODE"
  if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "202" ]; then
    echo "  IndexNow rejected batch $BATCH_NUM (HTTP $HTTP_CODE)"
    FAILED=1
  fi
  [ $((i + BATCH_SIZE)) -lt "$TOTAL" ] && sleep 1
done

if [ "$FAILED" -ne 0 ]; then
  echo "IndexNow submission failed"
  exit 1
fi

echo "Done — $TOTAL URLs submitted to IndexNow"
