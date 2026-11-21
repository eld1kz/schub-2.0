#!/usr/bin/env bash
# Local Supabase for tests (npm run db:local): start it, wipe it, apply every migration in
# supabase/ in order, load supabase/seed.local.sql, and write .env.test.local for dev:local.
# Only ever talks to the local Docker stack; nothing here can reach the real project.
set -euo pipefail
cd "$(dirname "$0")/.."

# Same order as CLAUDE.md. New migrations go at the end.
MIGRATIONS=(
  schema opportunities contact teams profile portfolio connections-list auth notifications
  goals experience-details people-requests opportunity-details awards length-limits public-read people-discover notification-limits participant-notes display-name own-images team-contact google-photos account-photos delete-account open-to-team languages team-invites
)

npx supabase start
npx supabase db reset --no-seed

DB_CONTAINER="supabase_db_$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)"
run_sql() {
  docker exec -i "$DB_CONTAINER" psql -q -v ON_ERROR_STOP=1 -U postgres -d postgres < "$1"
}

for m in "${MIGRATIONS[@]}"; do
  echo "Applying $m.sql"
  run_sql "supabase/$m.sql"
done
echo "Seeding"
run_sql supabase/seed.local.sql

# Only the two public values the app needs, and the sign-in methods to show (email works against the
# local inbox); the tests read the rest from `supabase status`
eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|PUBLISHABLE_KEY|ANON_KEY)=')"
{
  echo "# Written by scripts/db-local.sh. Local Supabase only; gitignored."
  echo "NEXT_PUBLIC_SUPABASE_URL=$API_URL"
  echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE_KEY:-$ANON_KEY}"
  echo "AUTH_PROVIDERS=google,github,email"
} > .env.test.local

# `db reset` restarts the API containers before the migrations above run, so the REST API can load its schema
# partway through them and then miss a function added later (a schema-reload request is handled in the
# background, so it doesn't help in time). Tests that started then failed at random. Restarting the REST API
# now makes it load the finished schema; then wait until it, and sign-in, answer.
docker restart "supabase_rest_$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)" >/dev/null
KEY="${PUBLISHABLE_KEY:-$ANON_KEY}"
ready() {
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/rest/v1/teams?select=id&limit=1" -H "apikey: $KEY")" = 200 ] &&
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/auth/v1/health" -H "apikey: $KEY")" = 200 ]
}
for _ in $(seq 1 60); do ready && break; sleep 1; done
ready || { echo "Local Supabase API didn't come up" >&2; exit 1; }
echo "Local Supabase ready at $API_URL"
