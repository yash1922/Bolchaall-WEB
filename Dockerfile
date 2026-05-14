# Production image for the Bolchall API
# Used by Koyeb (and any other Docker-based host) to deploy api/ from this monorepo.
# The web/ workspace is excluded entirely — see .dockerignore.

FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm matching the version in package.json
RUN npm install -g pnpm@9.12.0

# Copy workspace manifests first for better Docker layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY api/package.json ./api/
COPY shared/package.json ./shared/

# Install only api + shared deps (skip web entirely — saves ~600 MB)
# --frozen-lockfile guarantees we use the exact lockfile from the repo
RUN pnpm install --frozen-lockfile --filter "api..." --filter "shared..."

# Copy the source last (changes most often)
COPY shared ./shared
COPY api ./api

# Compile TypeScript -> dist/
RUN pnpm --filter api build

# ---------- Runtime image ----------
FROM node:20-alpine AS runtime
WORKDIR /app

RUN npm install -g pnpm@9.12.0

# Copy built artifacts and node_modules from the builder
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder /app/api/package.json ./api/
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/src/seed ./api/src/seed
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api/node_modules ./api/node_modules

ENV NODE_ENV=production
# Koyeb sets $PORT automatically; our server reads it (falls back to 4000 locally).
EXPOSE 8000

WORKDIR /app/api
CMD ["node", "dist/server.js"]
