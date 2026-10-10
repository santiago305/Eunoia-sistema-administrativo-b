ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
RUN pnpm run build

# Development/test image keeps devDependencies (including Jest) while the
# production runner below remains dependency-minimized.
FROM build AS test
ENV NODE_ENV=test
CMD ["pnpm", "test", "--", "--runInBand"]

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
ENV NODE_ENV=production
ENV PORT=3000
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm store prune
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/src/modules/ubigeo/infrastructure/seed/data ./dist/modules/ubigeo/infrastructure/seed/data
RUN mkdir -p storage/public storage/private storage/deleted storage/quarantine storage/staging storage/private/mail-attachments storage/deleted/mail-attachments storage/quarantine/mail-attachments storage/staging/mail-attachments assets reports \
  && chown -R node:node storage assets reports
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider "http://127.0.0.1:${PORT}/api/health" || exit 1
CMD ["node", "dist/main"]
