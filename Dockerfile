FROM node:24.21.0-trixie-slim@sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66 AS tools
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@12.10.1
WORKDIR /workspace
ENV PNPM_STORE_DIR=/workspace/.pnpm-store

FROM tools AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY tools/contracts/package.json tools/contracts/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN DATABASE_URL=postgresql://unused:unused@localhost/unused pnpm --filter @s-clair/api db:generate

FROM dependencies AS api-build
RUN pnpm --filter @s-clair/api build

FROM api-build AS api
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]

FROM dependencies AS web-build
RUN pnpm --filter @s-clair/web build

FROM tools AS web
COPY --from=web-build /workspace/apps/web/dist/web/browser /workspace/public
COPY docker/serve-web.mjs /workspace/serve-web.mjs
ENV NODE_ENV=production
USER node
EXPOSE 4200
CMD ["node", "serve-web.mjs"]

FROM dependencies AS tests
RUN pnpm exec playwright install --with-deps chromium
ENV CI=true
CMD ["pnpm", "test:e2e"]
