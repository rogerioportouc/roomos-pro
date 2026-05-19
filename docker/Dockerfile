# ============================================================
#  RoomOS Pro — Dockerfile corrigido para EasyPanel
#  Multi-stage: frontend build → backend build → runner
# ============================================================

# ── Stage 1: Dependências e build do Frontend ─────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Instalar dependências ANTES de copiar o código (cache layer)
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

# Copiar código e fazer build
COPY frontend/ .
RUN npm run build

# ── Stage 2: Dependências e build do Backend ──────────────────
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Instalar dependências
COPY backend/package*.json ./
RUN npm ci

# Copiar código
COPY backend/ .

# Gerar Prisma client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# ── Stage 3: Imagem final de produção ─────────────────────────
FROM node:20-alpine AS runner

# Dependências do sistema
RUN apk add --no-cache dumb-init curl tzdata && \
    addgroup -g 1001 -S nodejs && \
    adduser  -S roomos -u 1001 -G nodejs && \
    mkdir -p /app/uploads /var/log/roomos && \
    chown -R roomos:nodejs /app /var/log/roomos

WORKDIR /app

# Instalar apenas dependências de produção do backend
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar artefatos buildados
COPY --from=backend-builder /app/backend/dist          ./dist
COPY --from=backend-builder /app/backend/prisma        ./prisma
COPY --from=backend-builder /app/backend/node_modules/.prisma \
                             ./node_modules/.prisma

# Copiar frontend buildado (servido pelo Express como estático)
COPY --from=frontend-builder /app/frontend/dist        ./frontend/dist

# Permissões finais
RUN chown -R roomos:nodejs /app

USER roomos

# Variáveis padrão
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=America/Sao_Paulo

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]

# Roda migrations do Prisma e depois inicia o servidor
CMD sh -c "npx prisma migrate deploy --schema ./prisma/schema.prisma && node dist/server.js"
