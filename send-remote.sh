#!/usr/bin/env bash
# Usage: RENDER_URL=https://xxx.onrender.com SEND_TOKEN=... ./send-remote.sh [title] [body]
set -euo pipefail
: "${RENDER_URL:?set RENDER_URL}"; : "${SEND_TOKEN:?set SEND_TOKEN}"
T="${1:-新預約}"; B="${2:-測試通知}"
curl -sS -X POST "${RENDER_URL%/}/send" -H "x-token: ${SEND_TOKEN}" -H 'content-type: application/json' \
  -d "$(node -e 'console.log(JSON.stringify({title:process.argv[1],body:process.argv[2]}))' "$T" "$B")"; echo
