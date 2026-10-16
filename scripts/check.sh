#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export LOCAL_UID="$(id -u)" LOCAL_GID="$(id -g)"
# Le même point d’entrée sert en local, sur une copie propre et dans la CI.
docker build --network "${BUILD_NETWORK:-default}" --target tools -t s-clair-tools:local .
docker run --rm --network "${BUILD_NETWORK:-default}" --user "$LOCAL_UID:$LOCAL_GID" \
  -v "$PWD:/workspace" -w /workspace \
  -e DATABASE_URL=postgresql://unused:unused@localhost/unused \
  s-clair-tools:local sh -c 'pnpm install --frozen-lockfile && pnpm --filter @s-clair/api db:generate && pnpm check'
# Projet et base éphémères, distincts des données de développement.
project="s-clair-check-${LOCAL_UID}-$$"
compose=(docker compose -p "$project" -f compose.test.yaml --profile tests)
cleanup() { "${compose[@]}" down --volumes --remove-orphans >/dev/null; }
trap cleanup EXIT
"${compose[@]}" build api web runner
"${compose[@]}" up -d --wait db
"${compose[@]}" run --rm --no-deps runner pnpm --filter @s-clair/api db:migrate
"${compose[@]}" run --rm --no-deps runner pnpm --filter @s-clair/api exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
"${compose[@]}" run --rm --no-deps runner pnpm test:integration
"${compose[@]}" run --rm --no-deps runner pnpm --filter @s-clair/api db:seed
"${compose[@]}" up -d --wait --wait-timeout 120 api web
"${compose[@]}" run --rm --no-deps runner pnpm test:e2e
"${compose[@]}" up -d --force-recreate --wait --wait-timeout 120 db api web
"${compose[@]}" run --rm --no-deps runner node scripts/probe.mjs persisted
"${compose[@]}" stop db
"${compose[@]}" run --rm --no-deps runner node scripts/probe.mjs unavailable
"${compose[@]}" start db
"${compose[@]}" run --rm --no-deps runner node scripts/probe.mjs ready
"${compose[@]}" run --rm --no-deps runner node scripts/probe.mjs persisted
