# Use official Node.js LTS image for stability
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Install dependencies (including dev dependencies for `tsc`)
COPY package*.json tsconfig.json ./

RUN npm ci --only=production=false

# Copy the rest of the source code
COPY . .

# Build the TypeScript project
RUN npm run build

# ---- Production Image ----
FROM node:20-slim

WORKDIR /app

# Install git and curl for health checks and other utilities
RUN apt-get update && \
    apt-get install -y git cron && \
    rm -rf /var/lib/apt/lists/*

# Copy only the built code and dependencies from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Command to run the server
CMD ["node", "dist/app.js"]
