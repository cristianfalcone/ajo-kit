#!/bin/sh
set -eu

artifact=/root/ajo/e2e-artifact
data=/root/ajo/e2e-data
log=/root/ajo/e2e-engine.log
pid=/root/ajo/e2e-engine.pid

if [ ! -d "$artifact" ]; then
	echo "Missing engine artifact: $artifact" >&2
	exit 1
fi

rm -rf "$data"
mkdir -p "$data"
rm -f "$log" "$pid"

export NODE_ENV=production
export APP_URL=http://127.0.0.1:8080
export APP_SECRET=ajo-e2e-only-secret-000000000001
export AJO_E2E_CONTROL=ajo-e2e-only-secret-000000000001
export HOST=0.0.0.0
export PORT=8080
export AJO_DATA="$data"
export DATABASE_PATH=e2e.sqlite

echo "$$" > "$pid"
exec /root/ajo/bin/ajo "$artifact" >> "$log" 2>&1
