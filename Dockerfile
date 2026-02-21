# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install pnpm and dependencies
RUN npm install -g pnpm@9.15.0
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy package files
COPY package.json ./

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY scripts/ ./scripts/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
