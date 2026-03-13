# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile 2>&1 || pnpm install

# Copy source code
COPY . .

# Build
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile 2>&1 || pnpm install --prod

# Copy built app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY scripts/ ./scripts/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start with explicit error handling
CMD ["node", "--trace-warnings", "dist/index.js"]
