# syntax=docker/dockerfile:1

# --- deps ---
FROM node:24-alpine AS deps
WORKDIR /app
# pnpm-workspace.yaml holds the build-script approvals and native-binding settings;
# without it the image builds and then fails to boot.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# --- build ---
FROM node:24-alpine AS build
WORKDIR /app
ARG GIT_REVISION=dev
ENV GIT_REVISION=$GIT_REVISION
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build
# `output: 'standalone'` only traces what the app imports, so the migrator is
# bundled on its own.
RUN pnpm exec esbuild lib/db/migrate.ts \
      --bundle --platform=node --format=cjs --outfile=dist/migrate.cjs

# --- runtime ---
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Listen on every interface; the default binds to the container hostname only.
ENV HOSTNAME=0.0.0.0
ARG GIT_REVISION=unknown
ENV GIT_REVISION=$GIT_REVISION

RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/.next/standalone ./
# Static assets and public/ are not traced into the standalone output. public/
# must exist in git (public/.gitkeep) or this COPY fails on a clean checkout.
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/lib/db/migrations ./lib/db/migrations
COPY --from=build /app/dist/migrate.cjs ./dist/migrate.cjs
COPY docker-entrypoint.sh /usr/local/bin/
# COPY keeps the source file's mode; set the bit here so a commit without it
# can't produce a container that exits with `permission denied`. Create any
# writable data directory and chown it to `app` here, before USER.
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER app
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
