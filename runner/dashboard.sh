#!/bin/sh
# Kindle e-ink dashboard refresher
TMP="/tmp/dashboard.png"
INTERVAL=${INTERVAL:-60}      # seconds between refreshes
FULL_EVERY=${FULL_EVERY:-10}  # full refresh frequency (in iterations)

if [ -z "$URL" ]; then
  echo "[dashboard] ERROR: URL not set. Use: URL=http://host/dashboard-kindle.png ./dashboard.sh"
  exit 1
fi

EIPS="/usr/sbin/eips"
FBINK="/mnt/us/libkh/bin/fbink"

count=0
while true; do
  if curl -sf -o "$TMP" "$URL"; then
    count=$((count + 1))
    if [ $((count % FULL_EVERY)) -eq 0 ]; then
      $EIPS -c
      sleep 0.8
    fi
    # use fbink for faster and cleaner drawing
    $EIPS -g "$TMP"
  else
    $FBINK -pm "Fetch failed $(date '+%H:%M:%S')"
  fi
  sleep $INTERVAL
done
