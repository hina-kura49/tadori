#!/usr/bin/env bash
# ローカルの PostgreSQL (docker compose) を起動し、マイグレーションを当ててから API を起動する。
#
#   pnpm dev:api            # http://localhost:4000
#   pnpm dev:api --seed     # 初回だけ: サンプルデータも入れる
#
# 接続先は apps/api/.env (ローカル用)。念のため DB の接続先はここでもローカルに固定する。
set -euo pipefail

cd "$(dirname "$0")/.."
docker compose -f apps/api/docker-compose.yml up -d --wait db

export DATABASE_URL="postgres://tadori:tadori@localhost:55432/tadori"
export DATABASE_MIGRATION_URL="$DATABASE_URL"
unset ENV_FILE

cd apps/api
pnpm db:migrate
if [[ "${1:-}" == "--seed" ]]; then pnpm db:seed; fi
exec pnpm dev
