# ---- Builder Stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Install deps (dev included for TypeScript build)
COPY package*.json tsconfig.json ./
RUN npm ci --only=production=false

# Copy source and build
COPY . .
RUN npm run build


# ---- Production Stage ----
FROM node:20-slim

WORKDIR /app

# Install utilities:
# - iproute2 → provides `ip` command
# - docker.io → docker CLI
# - curl/git/cron → for health checks, vcs, scheduling
RUN apt-get update && \
    apt-get install -y \
      iproute2 \
      docker.io \
      git \
      curl \
      cron && \
    rm -rf /var/lib/apt/lists/*

# Copy built code and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Default command
CMD ["node", "dist/app.js"]
