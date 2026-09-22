FROM node:24-bookworm-slim

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

COPY package.json pnpm-lock.yaml ./
# tsx is currently a devDependency and is required to run the TypeScript entrypoint.
RUN pnpm install --frozen-lockfile --prod=false

COPY . .
RUN pnpm typecheck

ENV NODE_ENV=production
ENV PORT=4000
USER node
EXPOSE 4000

CMD ["node", "--import", "tsx", "src/index.ts"]
