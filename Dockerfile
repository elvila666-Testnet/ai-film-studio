# ---------- builder ----------
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- runner ----------
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE 3000

# memory safety
CMD ["node", "--max-old-space-size=512", "dist/index.js"]
