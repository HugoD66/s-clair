#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export LOCAL_UID="$(id -u)" LOCAL_GID="$(id -g)"
# Configuration Compose uniquement ; les commandes Node sont exécutées dans Docker.
if [[ ! -f .env ]]; then
  echo 'Copier .env.example vers .env avant le premier démarrage.' >&2
  exit 1
fi
case "${1:-up}" in
  install)
    docker compose build api
    docker run --rm --network "${BUILD_NETWORK:-default}" --user "$LOCAL_UID:$LOCAL_GID" \
      -v "$PWD:/workspace" -w /workspace \
      -e DATABASE_URL=postgresql://unused:unused@localhost/unused \
      s-clair-tools:local sh -c 'pnpm install --frozen-lockfile && pnpm --filter @s-clair/api db:generate'
    ;;
  setup)
    "$0" install
    docker compose up -d --wait db
    docker compose run --rm --no-deps api pnpm --filter @s-clair/api db:migrate
    ;;
  up) docker compose up -d --wait --wait-timeout 120 ;;
  seed) docker compose run --rm --no-deps api pnpm --filter @s-clair/api db:seed ;;
  down) docker compose down ;;
  logs) docker compose logs --tail 100 -f ;;
  *) echo 'Usage: scripts/dev.sh {install|setup|up|seed|down|logs}' >&2; exit 2 ;;
esac
