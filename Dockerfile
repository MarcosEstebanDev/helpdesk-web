# Multi-stage build para Next.js en modo `output: standalone`.
# pnpm 11 via corepack, Node 24 (mismo tooling que helpdesk-api).

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---- deps: todas las dependencias (incluye dev, para buildear) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build: compila Next -> .next/standalone ----
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
# La URL de la API se fija AQUI, no al arrancar el contenedor: Next sustituye
# las `NEXT_PUBLIC_*` estaticamente durante el build (por eso `lib/env.ts` las
# referencia por nombre completo). Pasarla como variable de runtime no tendria
# ningun efecto sobre el bundle que llega al navegador.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- runner: imagen mínima con el server standalone ----
FROM node:24-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# `standalone` trae su propio node_modules mínimo + server.js.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
