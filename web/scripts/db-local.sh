#!/usr/bin/env bash
# Local Supabase for tests (npm run db:local): start it, wipe it, apply every migration in
# supabase/ in order, load supabase/seed.local.sql, and write .env.test.local for dev:local.
# Only ever talks to the local Docker stack; nothing here can reach the real project.
set -euo pipefail
cd "$(dirname "$0")/.."

# Same order as CLAUDE.md. New migrations go at the end.
MIGRATIONS=(
  schema opportunities contact teams profile portfolio connections-list auth notifications
  goals experience-details people-requests opportunity-details awards length-limits public-read people-discover notification-limits participant-notes display-name own-images
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
echo "Local Supabase ready at $API_URL"
