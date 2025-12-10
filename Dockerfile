# ============================================
# Stage 1: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de build para variables VITE_*
ARG VITE_API_BASE_URL
ARG VITE_ALLOWED_HOST_APP
ARG VITE_ALLOWED_HOST_CORE
ARG VITE_USE_MOCK_AUTH

# Establecer como ENV para que Vite las tome en build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ALLOWED_HOST_APP=$VITE_ALLOWED_HOST_APP
ENV VITE_ALLOWED_HOST_CORE=$VITE_ALLOWED_HOST_CORE
ENV VITE_USE_MOCK_AUTH=$VITE_USE_MOCK_AUTH

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci --legacy-peer-deps

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# ============================================
# Stage 2: Production con Serve
# ============================================
FROM node:20-alpine AS production

# Instalar serve globalmente
RUN npm install -g serve

WORKDIR /app

# Copiar archivos compilados desde builder (usuario node ya existe en la imagen)
COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]