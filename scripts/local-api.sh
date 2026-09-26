#!/usr/bin/env bash
# Web 版の動作確認用に、ローカルの Postgres に繋いだ API を起動する。
#
#   ./scripts/local-api.sh          # DB を用意して API を起動 (http://localhost:4000)
#   ./scripts/local-api.sh --seed   # 初回だけ: サンプルデータも入れる
#
# apps/api/.env は本番 DB を指していることがあるため、DB まわりの環境変数をここで必ず上書きする。
# (.env の読み込みは既存の環境変数を上書きしない)
set -euo pipefail

CONTAINER=tadori-local-db
PORT=55432
LOCAL_DB="postgres://tadori:tadori@localhost:${PORT}/tadori"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    docker start "$CONTAINER" >/dev/null
  else
    docker run -d --name "$CONTAINER" -p "${PORT}:5432" \
      -e POSTGRES_USER=tadori -e POSTGRES_PASSWORD=tadori -e POSTGRES_DB=tadori \
      -v tadori_local_pg:/var/lib/postgresql/data postgres:17 >/dev/null
  fi
  until docker exec "$CONTAINER" pg_isready -U tadori >/dev/null 2>&1; do sleep 1; done
fi

export NODE_ENV=development
export DATABASE_URL="$LOCAL_DB"
export DATABASE_MIGRATION_URL="$LOCAL_DB"
export BETTER_AUTH_URL="http://localhost:4000"
export CORS_ORIGIN="http://localhost:5173,http://localhost:8081"
export AUTH_EMAIL_PASSWORD_ENABLED=true

cd "$(dirname "$0")/../apps/api"
pnpm db:migrate
if [[ "${1:-}" == "--seed" ]]; then pnpm db:seed; fi
exec pnpm dev
