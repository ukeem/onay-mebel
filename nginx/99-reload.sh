#!/bin/sh
set -e

# Reload nginx shortly after startup to refresh upstream DNS after redeploys.
(
  i=0
  while [ "$i" -lt 10 ]; do
    sleep 2
    if nginx -s reload >/dev/null 2>&1; then
      exit 0
    fi
    i=$((i + 1))
  done
) &
