# -------- Base --------
FROM node:22.11.0-alpine3.20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# -------- Deps (ci) --------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -------- Build --------
FROM deps AS build
COPY . .
# Gera a build TS -> JS (ajuste o script "build" no package.json se necessário)
RUN pnpm build

# -------- Prod runtime --------
FROM node:22-alpine AS prod
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# RUN corepack enable
WORKDIR /app

# Só dependências de produção
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copia artefatos de build
COPY --from=build /app/dist ./dist
COPY openapi.yaml ./openapi.yaml

EXPOSE 3000
CMD ["node", "dist/main/server.js"]