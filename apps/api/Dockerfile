# ビルドコンテキストはリポジトリのルート:
#   docker build -f apps/api/Dockerfile -t tadori-api .
FROM node:24-bookworm-slim

WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

# lockfile だけで依存を先に取得し、ソース変更時もこの層をキャッシュできるようにする
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm fetch

COPY package.json ./
COPY apps/api/package.json apps/api/
# tsx is currently a devDependency and is required to run the TypeScript entrypoint.
RUN pnpm install --offline --frozen-lockfile --filter @tadori/api --prod=false

COPY apps/api apps/api
WORKDIR /repo/apps/api
RUN pnpm typecheck

ENV NODE_ENV=production
ENV PORT=4000
USER node
EXPOSE 4000

CMD ["node", "--import", "tsx", "src/index.ts"]
