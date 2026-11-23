#!/bin/sh
# Starts the app in demo mode on this machine: a fresh database, the app, Keycloak and Mailpit in Docker Compose,
# then the demo data (two fictitious people, three shared lists) through tools/seed-demo.mjs.
#
#   tools/start-demo.sh            start with fresh data (all previous data of the local stack is deleted)
#   tools/start-demo.sh --rebuild  also rebuild the frontend and the application image from the current code first
#   tools/start-demo.sh --stop     stop the demo stack (data stays until the next start)
#
# The image `groceries:local` is built once when it does not exist yet (needs Node.js 24 and Java 25).
# Local use only: all accounts and secrets are fictitious development values (DP-ENV-01, SEC-INC-01).
set -eu

root="$(cd "$(dirname "$0")/.." && pwd)"
compose() {
  (cd "$root/backend" && docker compose --profile auth --profile mail -f compose.yaml -f compose.app.yaml "$@")
}

case "${1:-}" in
  --stop)
    compose down
    echo "Demo stack stopped."
    exit 0
    ;;
  --rebuild) rebuild=1 ;;
  "") rebuild=0 ;;
  *)
    echo "Usage: tools/start-demo.sh [--rebuild | --stop]" >&2
    exit 2
    ;;
esac

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing prerequisite: $1" >&2
    exit 1
  }
}
need docker
need node
docker info >/dev/null 2>&1 || {
  echo "Docker is not running." >&2
  exit 1
}

if [ "$rebuild" = 1 ] || ! docker image inspect groceries:local >/dev/null 2>&1; then
  echo "==> Building the frontend and the application image (groceries:local)"
  (cd "$root/frontend" && { [ -d node_modules ] || npm ci; } && npm run build)
  (cd "$root/backend" && ./mvnw -q spring-boot:build-image -DskipTests \
    -Dfrontend.dist=../frontend/dist/frontend/browser -Dspring-boot.build-image.imageName=groceries:local)
fi

echo "==> Starting the stack with a fresh database"
compose down -v --remove-orphans >/dev/null 2>&1 || true
compose up -d --wait

echo "==> Waiting for the app"
tries=0
until curl -sf http://localhost:8080/livez >/dev/null 2>&1; do
  tries=$((tries + 1))
  [ "$tries" -le 60 ] || {
    echo "The app did not become ready; see: docker compose logs app" >&2
    exit 1
  }
  sleep 2
done

echo "==> Creating the demo data"
node "$root/tools/seed-demo.mjs"

cat <<'EOF'

The app runs in demo mode.

  App      http://localhost:8080
  Mailpit  http://localhost:8025   (password-reset mails land here)

  Anna     anna@example.test   Demo-Passwort-1
  Ben      ben@example.test    Demo-Passwort-2

Use a second browser profile or a private window to be both people at once.
Stop with: tools/start-demo.sh --stop
EOF
