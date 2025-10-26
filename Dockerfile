# ---- Builder Stage ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install dependencies and build TypeScript
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build


# ---- Production Stage ----
FROM node:20-bookworm-slim

WORKDIR /app

# Install only what we actually need at runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      git \
      ca-certificates \
      curl \
      iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Copy built code and runtime deps
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Default command
CMD ["node", "build/app.js"]
