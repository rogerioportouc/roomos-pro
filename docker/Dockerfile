# ============================================================
#  RoomOS Pro — Dockerfile multi-stage
#  Otimizado para EasyPanel (Nixpacks ou Dockerfile)
# ============================================================

# ── Stage 1: Build frontend ───────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ .
RUN npm run build

# ── Stage 2: Build backend ────────────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /build/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────
FROM node:20-alpine AS runner
LABEL maintainer="RoomOS Pro <admin@suaempresa.com>"
LABEL version="2.4.1"

# System deps
RUN apk add --no-cache dumb-init curl tzdata && \
    addgroup -g 1001 -S nodejs && \
    adduser  -S roomos -u 1001 -G nodejs

WORKDIR /app

# Backend production deps
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts
COPY --from=backend-builder /build/backend/dist ./dist
COPY --from=backend-builder /build/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /build/backend/prisma ./prisma
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Uploads directory
RUN mkdir -p /app/uploads && \
    mkdir -p /var/log/roomos && \
    chown -R roomos:nodejs /app /var/log/roomos

USER roomos

# Environment defaults
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=America/Sao_Paulo

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# dumb-init handles PID 1 signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations then start server
CMD sh -c "npx prisma migrate deploy && node dist/server.js"
