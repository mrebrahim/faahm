#!/usr/bin/env bash
#
# Deploy فاهم on an aaPanel server, without Docker.
#
# Builds the Next.js standalone bundle and swaps it in behind PM2. Run it
# on the server, from anywhere:
#
#     bash /www/wwwroot/faahm/deploy.sh                # deploy origin/main
#     bash /www/wwwroot/faahm/deploy.sh ca4b93f        # deploy one commit
#
# ---------------------------------------------------------------------------
# THE ONE THING THAT BREAKS THIS
#
# Next.js splits env vars in two, and getting it wrong produces a site that
# boots fine and then fails on every page:
#
#   NEXT_PUBLIC_*  are INLINED INTO THE BUILD. They must exist when `next
#                  build` runs, or the browser bundle ships with undefined
#                  and Supabase never connects.
#   everything else is read AT RUNTIME. SUPABASE_SERVICE_ROLE_KEY,
#                  STRIPE_SECRET_KEY and friends must be in the process
#                  environment of the running server.
#
# So the env file is loaded for BOTH steps below. A build with only the
# public vars, or a runtime with only the public vars, is the failure mode
# to watch for — the site renders, and every course page is empty or 500.
# ---------------------------------------------------------------------------

set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/faahm}"
REPO="${REPO:-https://github.com/mrebrahim/faahm.git}"
ENV_FILE="${ENV_FILE:-$APP_DIR/faahm.env}"
APP_NAME="${APP_NAME:-faahm}"
PORT="${PORT:-3000}"
REF="${1:-origin/main}"

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m!! %s\033[0m\n' "$*" >&2; exit 1; }

command -v node >/dev/null || die "node not found. Install Node 20 from aaPanel → App Store → Node.js."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "Node $NODE_MAJOR is too old; Next.js 14 needs 18+. Node 20 is what production uses."
[ -f "$ENV_FILE" ] || die "No env file at $ENV_FILE. Copy .env.example there and fill it in."

# ── 1. source ───────────────────────────────────────────────────────────────
say "Fetching $REF"
if [ ! -d "$APP_DIR/src/.git" ]; then
  mkdir -p "$APP_DIR"
  git clone "$REPO" "$APP_DIR/src"
fi
cd "$APP_DIR/src"
git fetch origin main --tags
git checkout -f "$REF"
git log -1 --oneline

# ── 2. env ──────────────────────────────────────────────────────────────────
# Exported so `next build` sees the NEXT_PUBLIC_* values and inlines them.
say "Loading env from $ENV_FILE"
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] || die "NEXT_PUBLIC_SUPABASE_URL is empty — the build would ship a broken client."
[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] || die "SUPABASE_SERVICE_ROLE_KEY is empty — every server-side page read would fail."

# ── 3. build ────────────────────────────────────────────────────────────────
say "Installing dependencies"
npm ci --no-audit --no-fund

say "Building"
npm run build

# `output: 'standalone'` emits a self-contained server, but Next does NOT
# copy the static assets into it — without them you get a running server
# with no CSS and no JS chunks.
say "Assembling the standalone bundle"
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/

# This repo has no public/ directory and never has. Copying it
# unconditionally aborted the deploy right after a successful build,
# which is a silly way to lose two minutes — so only copy it if some
# future commit adds one.
if [ -d public ]; then
  cp -r public .next/standalone/
fi

[ -f .next/standalone/server.js ] || die "Build produced no standalone server. Check next.config.js still sets output: 'standalone'."

# ── 4. release swap ─────────────────────────────────────────────────────────
# Built into a fresh directory and swapped by symlink, so a failed build
# never leaves the site half-replaced, and rollback is one ln -s.
RELEASE="$APP_DIR/releases/$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
say "Publishing to $RELEASE"
mkdir -p "$APP_DIR/releases"
cp -r .next/standalone "$RELEASE"
ln -sfn "$RELEASE" "$APP_DIR/current"

# Keep the last five releases so a rollback target always exists.
ls -1dt "$APP_DIR"/releases/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf

# ── 5. run ──────────────────────────────────────────────────────────────────
command -v pm2 >/dev/null || { say "Installing pm2"; npm install -g pm2; }

say "Restarting $APP_NAME on port $PORT"
# HOSTNAME=0.0.0.0 matters: the standalone server binds localhost only by
# default, and nginx on the same box would still reach it — but Docker or a
# remote proxy would not. 0.0.0.0 keeps both cases working.
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
PORT="$PORT" HOSTNAME=0.0.0.0 NODE_ENV=production \
  pm2 start "$APP_DIR/current/server.js" --name "$APP_NAME" --update-env
pm2 save

# ── 6. prove it ─────────────────────────────────────────────────────────────
say "Checking it answers"
for i in $(seq 1 15); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$PORT/login" || true)"
  [ "$CODE" = "200" ] && break
  sleep 2
done

[ "$CODE" = "200" ] || {
  pm2 logs "$APP_NAME" --lines 40 --nostream || true
  die "Server did not return 200 on /login (got ${CODE:-no response}). Logs above; the previous release is still in $APP_DIR/releases."
}

say "Deployed $(git log -1 --oneline) — http://127.0.0.1:$PORT answers 200"
echo "Point aaPanel's reverse proxy for faahm.com at http://127.0.0.1:$PORT"
