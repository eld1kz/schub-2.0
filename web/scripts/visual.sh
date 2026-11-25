#!/usr/bin/env bash
# Screenshot tests (npm run test:visual, or test:visual:update to accept changes). Resets the local Supabase to the
# seed, serves the app on port 3103 with today fixed (FIXED_TODAY) so dates don't move, and runs
# playwright.visual.config.ts in the Playwright Docker image, whose fonts and rendering are the same everywhere.
# Extra arguments go to `playwright test`.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=3103
API_PORT=$(sed -n '/^\[api\]/,/^\[/s/^port = \([0-9]*\)/\1/p' supabase/config.toml)
VERSION=$(node -p 'require("@playwright/test/package.json").version')

npm run db:local

set -a && . ./.env.test.local && set +a
FIXED_TODAY=2026-11-20 NEXT_DIST_DIR=.next-visual npx next dev -p "$PORT" > .next-visual.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
echo "Waiting for the app on port $PORT"
for _ in $(seq 1 180); do
  curl -sf -o /dev/null "http://localhost:$PORT/opportunities" && break
  sleep 1
done

docker run --rm --init --ipc=host --add-host=host.docker.internal:host-gateway \
  -v "$PWD":/work -w /work -e CI \
  "mcr.microsoft.com/playwright:v$VERSION-noble" \
  bash -c 'node scripts/forward-ports.mjs '"$PORT $API_PORT"' & sleep 1 && npx playwright test -c playwright.visual.config.ts "$@"' -- "$@"
